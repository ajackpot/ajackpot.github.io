export const benchmarkResultsCheckout = {
  "generatedAt": "2026-04-01T00:15:01.192Z",
  "variants": {
    "variantA": {
      "label": "비교안 A · 조작 부담이 큰 구조",
      "description": "상단 보조 링크와 길게 이어진 신청 단계들을 차례로 지나야 원하는 항목에 도달하고, 각 항목마다 현재 상태, 최근 확인, 설명 보기, 값 선택 버튼이 흩어져 있으며, 설명 대화상자를 닫으면 신청 단계 제목 근처로 돌아와 다시 위치를 찾아야 하는 구조.",
      "tasks": {
        "task1_remote_contact_card_submit": {
          "title": "비대면 초진 상담을 고르고 연락처 확인 안내를 켠 뒤 카드 결제로 신청 완료",
          "assumptions": [
            "상단 보조 링크와 앞선 신청 단계 안내 링크를 지나야 신청 정보에 도달한다.",
            "상담 종류, 연락처 확인 안내, 결제 수단, 제출 버튼이 서로 멀리 떨어져 있어 긴 순차 이동이 필요하다.",
            "제출 확인은 맨 아래에 있어 원하는 값을 모두 바꾼 뒤 다시 내려가야 한다."
          ],
          "structural": {
            "totals": {
              "navMoves": 49,
              "activations": 4,
              "decisions": 14,
              "waits": 1,
              "speechUnits": 22,
              "scanSteps": 57,
              "contextResets": 0
            },
            "byBucket": {
              "entry": {
                "navMoves": 24,
                "activations": 0,
                "decisions": 6,
                "waits": 0,
                "speechUnits": 10,
                "scanSteps": 28,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 25,
                "activations": 4,
                "decisions": 8,
                "waits": 1,
                "speechUnits": 12,
                "scanSteps": 29,
                "contextResets": 0
              },
              "recovery": {
                "navMoves": 0,
                "activations": 0,
                "decisions": 0,
                "waits": 0,
                "speechUnits": 0,
                "scanSteps": 0,
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
                  "milliseconds": 28930,
                  "seconds": 28.9
                },
                "expected": {
                  "milliseconds": 42450,
                  "seconds": 42.5
                },
                "upper": {
                  "milliseconds": 59520,
                  "seconds": 59.5
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 13320,
                    "seconds": 13.3
                  },
                  "repeated": {
                    "milliseconds": 15610,
                    "seconds": 15.6
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 19500,
                    "seconds": 19.5
                  },
                  "repeated": {
                    "milliseconds": 22950,
                    "seconds": 22.9
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 27300,
                    "seconds": 27.3
                  },
                  "repeated": {
                    "milliseconds": 32220,
                    "seconds": 32.2
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                }
              }
            },
            "screenReader": {
              "label": "화면낭독 사용자",
              "description": "키보드 비용에 발화 청취와 문맥 재구축 비용을 더한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 48780,
                  "seconds": 48.8
                },
                "expected": {
                  "milliseconds": 69040,
                  "seconds": 69
                },
                "upper": {
                  "milliseconds": 96330,
                  "seconds": 96.3
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 22600,
                    "seconds": 22.6
                  },
                  "repeated": {
                    "milliseconds": 26180,
                    "seconds": 26.2
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 31920,
                    "seconds": 31.9
                  },
                  "repeated": {
                    "milliseconds": 37120,
                    "seconds": 37.1
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 44500,
                    "seconds": 44.5
                  },
                  "repeated": {
                    "milliseconds": 51830,
                    "seconds": 51.8
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                }
              }
            },
            "switch": {
              "label": "스위치 사용자",
              "description": "자동 스캔 기반 순차 입력을 가정한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 65470,
                  "seconds": 65.5
                },
                "expected": {
                  "milliseconds": 96540,
                  "seconds": 96.5
                },
                "upper": {
                  "milliseconds": 144120,
                  "seconds": 144.1
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 30200,
                    "seconds": 30.2
                  },
                  "repeated": {
                    "milliseconds": 35270,
                    "seconds": 35.3
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 44600,
                    "seconds": 44.6
                  },
                  "repeated": {
                    "milliseconds": 51940,
                    "seconds": 51.9
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 66900,
                    "seconds": 66.9
                  },
                  "repeated": {
                    "milliseconds": 77220,
                    "seconds": 77.2
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                }
              }
            }
          }
        },
        "task2_guardian_help_bank_submit": {
          "title": "보호자 대리 신청과 준비 안내 설명 확인 뒤 계좌 이체로 신청 완료",
          "assumptions": [
            "신청 대상, 준비 안내 설명, 준비 안내 값, 결제 수단, 제출 버튼이 서로 다른 단계에 흩어져 있다.",
            "준비 안내 설명을 닫으면 방금 사용한 버튼이 아니라 신청 단계 제목 근처로 돌아온다.",
            "설명 확인 뒤 안내 수신 항목과 제출 확인 단계까지 다시 찾아야 해 복구 비용이 커진다."
          ],
          "structural": {
            "totals": {
              "navMoves": 56,
              "activations": 6,
              "decisions": 17,
              "waits": 1,
              "speechUnits": 26,
              "scanSteps": 66,
              "contextResets": 2
            },
            "byBucket": {
              "entry": {
                "navMoves": 17,
                "activations": 0,
                "decisions": 4,
                "waits": 0,
                "speechUnits": 7,
                "scanSteps": 20,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 29,
                "activations": 4,
                "decisions": 9,
                "waits": 1,
                "speechUnits": 14,
                "scanSteps": 34,
                "contextResets": 0
              },
              "recovery": {
                "navMoves": 10,
                "activations": 2,
                "decisions": 4,
                "waits": 0,
                "speechUnits": 5,
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
                  "milliseconds": 34442,
                  "seconds": 34.4
                },
                "expected": {
                  "milliseconds": 52025,
                  "seconds": 52
                },
                "upper": {
                  "milliseconds": 75736,
                  "seconds": 75.7
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 9330,
                    "seconds": 9.3
                  },
                  "repeated": {
                    "milliseconds": 17830,
                    "seconds": 17.8
                  },
                  "recovery": {
                    "milliseconds": 7282,
                    "seconds": 7.3
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 13650,
                    "seconds": 13.7
                  },
                  "repeated": {
                    "milliseconds": 26200,
                    "seconds": 26.2
                  },
                  "recovery": {
                    "milliseconds": 12175,
                    "seconds": 12.2
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 19100,
                    "seconds": 19.1
                  },
                  "repeated": {
                    "milliseconds": 36770,
                    "seconds": 36.8
                  },
                  "recovery": {
                    "milliseconds": 19866,
                    "seconds": 19.9
                  }
                }
              }
            },
            "screenReader": {
              "label": "화면낭독 사용자",
              "description": "키보드 비용에 발화 청취와 문맥 재구축 비용을 더한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 61324,
                  "seconds": 61.3
                },
                "expected": {
                  "milliseconds": 91772,
                  "seconds": 91.8
                },
                "upper": {
                  "milliseconds": 135098,
                  "seconds": 135.1
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 15820,
                    "seconds": 15.8
                  },
                  "repeated": {
                    "milliseconds": 30000,
                    "seconds": 30
                  },
                  "recovery": {
                    "milliseconds": 15504,
                    "seconds": 15.5
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 22340,
                    "seconds": 22.3
                  },
                  "repeated": {
                    "milliseconds": 42520,
                    "seconds": 42.5
                  },
                  "recovery": {
                    "milliseconds": 26912,
                    "seconds": 26.9
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 31130,
                    "seconds": 31.1
                  },
                  "repeated": {
                    "milliseconds": 59360,
                    "seconds": 59.4
                  },
                  "recovery": {
                    "milliseconds": 44608,
                    "seconds": 44.6
                  }
                }
              }
            },
            "switch": {
              "label": "스위치 사용자",
              "description": "자동 스캔 기반 순차 입력을 가정한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 81780,
                  "seconds": 81.8
                },
                "expected": {
                  "milliseconds": 128334,
                  "seconds": 128.3
                },
                "upper": {
                  "milliseconds": 206190,
                  "seconds": 206.2
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 21400,
                    "seconds": 21.4
                  },
                  "repeated": {
                    "milliseconds": 40620,
                    "seconds": 40.6
                  },
                  "recovery": {
                    "milliseconds": 19760,
                    "seconds": 19.8
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 31600,
                    "seconds": 31.6
                  },
                  "repeated": {
                    "milliseconds": 59840,
                    "seconds": 59.8
                  },
                  "recovery": {
                    "milliseconds": 36894,
                    "seconds": 36.9
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 47400,
                    "seconds": 47.4
                  },
                  "repeated": {
                    "milliseconds": 89070,
                    "seconds": 89.1
                  },
                  "recovery": {
                    "milliseconds": 69720,
                    "seconds": 69.7
                  }
                }
              }
            }
          }
        },
        "task3_return_receipt_easy_submit": {
          "title": "재방문 빠른 상담과 문자 영수증, 간편 결제로 신청 완료",
          "assumptions": [
            "상담 종류를 바꾼 뒤 결제 단계로 길게 이동해야 한다.",
            "영수증 받는 방법과 결제 수단 선택 버튼이 각각 따로 흩어져 있어 반복 이동이 크다.",
            "제출 확인 단계가 마지막에 있어 필요한 값을 맞춘 뒤 다시 한 번 길게 내려가야 한다."
          ],
          "structural": {
            "totals": {
              "navMoves": 48,
              "activations": 4,
              "decisions": 13,
              "waits": 1,
              "speechUnits": 21,
              "scanSteps": 56,
              "contextResets": 0
            },
            "byBucket": {
              "entry": {
                "navMoves": 24,
                "activations": 0,
                "decisions": 5,
                "waits": 0,
                "speechUnits": 9,
                "scanSteps": 28,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 24,
                "activations": 4,
                "decisions": 8,
                "waits": 1,
                "speechUnits": 12,
                "scanSteps": 28,
                "contextResets": 0
              },
              "recovery": {
                "navMoves": 0,
                "activations": 0,
                "decisions": 0,
                "waits": 0,
                "speechUnits": 0,
                "scanSteps": 0,
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
                  "milliseconds": 28060,
                  "seconds": 28.1
                },
                "expected": {
                  "milliseconds": 41150,
                  "seconds": 41.1
                },
                "upper": {
                  "milliseconds": 57670,
                  "seconds": 57.7
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 12900,
                    "seconds": 12.9
                  },
                  "repeated": {
                    "milliseconds": 15160,
                    "seconds": 15.2
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 18850,
                    "seconds": 18.9
                  },
                  "repeated": {
                    "milliseconds": 22300,
                    "seconds": 22.3
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 26350,
                    "seconds": 26.4
                  },
                  "repeated": {
                    "milliseconds": 31320,
                    "seconds": 31.3
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                }
              }
            },
            "screenReader": {
              "label": "화면낭독 사용자",
              "description": "키보드 비용에 발화 청취와 문맥 재구축 비용을 더한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 47220,
                  "seconds": 47.2
                },
                "expected": {
                  "milliseconds": 66820,
                  "seconds": 66.8
                },
                "upper": {
                  "milliseconds": 93190,
                  "seconds": 93.2
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 21740,
                    "seconds": 21.7
                  },
                  "repeated": {
                    "milliseconds": 25480,
                    "seconds": 25.5
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 30680,
                    "seconds": 30.7
                  },
                  "repeated": {
                    "milliseconds": 36140,
                    "seconds": 36.1
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 42710,
                    "seconds": 42.7
                  },
                  "repeated": {
                    "milliseconds": 50480,
                    "seconds": 50.5
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                }
              }
            },
            "switch": {
              "label": "스위치 사용자",
              "description": "자동 스캔 기반 순차 입력을 가정한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 63920,
                  "seconds": 63.9
                },
                "expected": {
                  "milliseconds": 94240,
                  "seconds": 94.2
                },
                "upper": {
                  "milliseconds": 140670,
                  "seconds": 140.7
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 29600,
                    "seconds": 29.6
                  },
                  "repeated": {
                    "milliseconds": 34320,
                    "seconds": 34.3
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 43700,
                    "seconds": 43.7
                  },
                  "repeated": {
                    "milliseconds": 50540,
                    "seconds": 50.5
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 65550,
                    "seconds": 65.5
                  },
                  "repeated": {
                    "milliseconds": 75120,
                    "seconds": 75.1
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
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
      "description": "신청 단계로 바로 이동해 첫 진입 부담을 낮추고, 신청 단계 묶음을 한 번 선택한 뒤 같은 묶음 안에서 필요한 값을 바꾸며, 설명 대화상자를 닫으면 방금 누른 설명 보기 버튼으로 돌아오고, 제출 단계로 빠르게 이동해 신청을 끝낼 수 있는 구조.",
      "tasks": {
        "task1_remote_contact_card_submit": {
          "title": "비대면 초진 상담을 고르고 연락처 확인 안내를 켠 뒤 카드 결제로 신청 완료",
          "assumptions": [
            "맨 앞의 신청 단계로 바로 이동 링크로 첫 진입 부담을 줄인다.",
            "신청 정보, 안내 수신, 결제 수단, 제출 확인을 묶음 선택으로 빠르게 오갈 수 있다.",
            "같은 묶음 안에서 값 변경과 제출을 가까운 거리에서 이어서 수행한다."
          ],
          "structural": {
            "totals": {
              "navMoves": 14,
              "activations": 3,
              "decisions": 7,
              "waits": 1,
              "speechUnits": 8,
              "scanSteps": 15,
              "contextResets": 0
            },
            "byBucket": {
              "entry": {
                "navMoves": 6,
                "activations": 1,
                "decisions": 3,
                "waits": 0,
                "speechUnits": 4,
                "scanSteps": 7,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 8,
                "activations": 2,
                "decisions": 4,
                "waits": 1,
                "speechUnits": 4,
                "scanSteps": 8,
                "contextResets": 0
              },
              "recovery": {
                "navMoves": 0,
                "activations": 0,
                "decisions": 0,
                "waits": 0,
                "speechUnits": 0,
                "scanSteps": 0,
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
                  "milliseconds": 10020,
                  "seconds": 10
                },
                "expected": {
                  "milliseconds": 14830,
                  "seconds": 14.8
                },
                "upper": {
                  "milliseconds": 20920,
                  "seconds": 20.9
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 4180,
                    "seconds": 4.2
                  },
                  "repeated": {
                    "milliseconds": 5840,
                    "seconds": 5.8
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 6170,
                    "seconds": 6.2
                  },
                  "repeated": {
                    "milliseconds": 8660,
                    "seconds": 8.7
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 8700,
                    "seconds": 8.7
                  },
                  "repeated": {
                    "milliseconds": 12220,
                    "seconds": 12.2
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                }
              }
            },
            "screenReader": {
              "label": "화면낭독 사용자",
              "description": "키보드 비용에 발화 청취와 문맥 재구축 비용을 더한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 16880,
                  "seconds": 16.9
                },
                "expected": {
                  "milliseconds": 24000,
                  "seconds": 24
                },
                "upper": {
                  "milliseconds": 33650,
                  "seconds": 33.6
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 7200,
                    "seconds": 7.2
                  },
                  "repeated": {
                    "milliseconds": 9680,
                    "seconds": 9.7
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 10220,
                    "seconds": 10.2
                  },
                  "repeated": {
                    "milliseconds": 13780,
                    "seconds": 13.8
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 14330,
                    "seconds": 14.3
                  },
                  "repeated": {
                    "milliseconds": 19320,
                    "seconds": 19.3
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                }
              }
            },
            "switch": {
              "label": "스위치 사용자",
              "description": "자동 스캔 기반 순차 입력을 가정한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 20670,
                  "seconds": 20.7
                },
                "expected": {
                  "milliseconds": 30460,
                  "seconds": 30.5
                },
                "upper": {
                  "milliseconds": 45170,
                  "seconds": 45.2
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 9150,
                    "seconds": 9.2
                  },
                  "repeated": {
                    "milliseconds": 11520,
                    "seconds": 11.5
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 13480,
                    "seconds": 13.5
                  },
                  "repeated": {
                    "milliseconds": 16980,
                    "seconds": 17
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 20050,
                    "seconds": 20.1
                  },
                  "repeated": {
                    "milliseconds": 25120,
                    "seconds": 25.1
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                }
              }
            }
          }
        },
        "task2_guardian_help_bank_submit": {
          "title": "보호자 대리 신청과 준비 안내 설명 확인 뒤 계좌 이체로 신청 완료",
          "assumptions": [
            "신청 대상과 준비 안내 받는 방법은 각 단계 묶음 안에서 짧게 접근할 수 있다.",
            "준비 안내 설명을 닫으면 같은 설명 보기 버튼으로 초점이 돌아와 바로 다음 선택을 이어서 할 수 있다.",
            "결제 수단 단계에서 계좌 이체로 다시 바꾼 뒤 제출 단계로 빠르게 이동할 수 있다."
          ],
          "structural": {
            "totals": {
              "navMoves": 17,
              "activations": 3,
              "decisions": 9,
              "waits": 1,
              "speechUnits": 9,
              "scanSteps": 18,
              "contextResets": 0
            },
            "byBucket": {
              "entry": {
                "navMoves": 5,
                "activations": 0,
                "decisions": 3,
                "waits": 0,
                "speechUnits": 3,
                "scanSteps": 6,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 8,
                "activations": 2,
                "decisions": 4,
                "waits": 1,
                "speechUnits": 4,
                "scanSteps": 8,
                "contextResets": 0
              },
              "recovery": {
                "navMoves": 4,
                "activations": 1,
                "decisions": 2,
                "waits": 0,
                "speechUnits": 2,
                "scanSteps": 4,
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
                  "milliseconds": 12496,
                  "seconds": 12.5
                },
                "expected": {
                  "milliseconds": 19136,
                  "seconds": 19.1
                },
                "upper": {
                  "milliseconds": 28198,
                  "seconds": 28.2
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 3510,
                    "seconds": 3.5
                  },
                  "repeated": {
                    "milliseconds": 5840,
                    "seconds": 5.8
                  },
                  "recovery": {
                    "milliseconds": 3146,
                    "seconds": 3.1
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 5200,
                    "seconds": 5.2
                  },
                  "repeated": {
                    "milliseconds": 8660,
                    "seconds": 8.7
                  },
                  "recovery": {
                    "milliseconds": 5276,
                    "seconds": 5.3
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 7350,
                    "seconds": 7.3
                  },
                  "repeated": {
                    "milliseconds": 12220,
                    "seconds": 12.2
                  },
                  "recovery": {
                    "milliseconds": 8628,
                    "seconds": 8.6
                  }
                }
              }
            },
            "screenReader": {
              "label": "화면낭독 사용자",
              "description": "키보드 비용에 발화 청취와 문맥 재구축 비용을 더한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 21496,
                  "seconds": 21.5
                },
                "expected": {
                  "milliseconds": 32231,
                  "seconds": 32.2
                },
                "upper": {
                  "milliseconds": 47590,
                  "seconds": 47.6
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 6080,
                    "seconds": 6.1
                  },
                  "repeated": {
                    "milliseconds": 9680,
                    "seconds": 9.7
                  },
                  "recovery": {
                    "milliseconds": 5736,
                    "seconds": 5.7
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 8620,
                    "seconds": 8.6
                  },
                  "repeated": {
                    "milliseconds": 13780,
                    "seconds": 13.8
                  },
                  "recovery": {
                    "milliseconds": 9831,
                    "seconds": 9.8
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 12120,
                    "seconds": 12.1
                  },
                  "repeated": {
                    "milliseconds": 19320,
                    "seconds": 19.3
                  },
                  "recovery": {
                    "milliseconds": 16150,
                    "seconds": 16.1
                  }
                }
              }
            },
            "switch": {
              "label": "스위치 사용자",
              "description": "자동 스캔 기반 순차 입력을 가정한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 26430,
                  "seconds": 26.4
                },
                "expected": {
                  "milliseconds": 41907,
                  "seconds": 41.9
                },
                "upper": {
                  "milliseconds": 67810,
                  "seconds": 67.8
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 7500,
                    "seconds": 7.5
                  },
                  "repeated": {
                    "milliseconds": 11520,
                    "seconds": 11.5
                  },
                  "recovery": {
                    "milliseconds": 7410,
                    "seconds": 7.4
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 11100,
                    "seconds": 11.1
                  },
                  "repeated": {
                    "milliseconds": 16980,
                    "seconds": 17
                  },
                  "recovery": {
                    "milliseconds": 13827,
                    "seconds": 13.8
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 16650,
                    "seconds": 16.6
                  },
                  "repeated": {
                    "milliseconds": 25120,
                    "seconds": 25.1
                  },
                  "recovery": {
                    "milliseconds": 26040,
                    "seconds": 26
                  }
                }
              }
            }
          }
        },
        "task3_return_receipt_easy_submit": {
          "title": "재방문 빠른 상담과 문자 영수증, 간편 결제로 신청 완료",
          "assumptions": [
            "신청 정보에서 재방문 빠른 상담으로 빠르게 바꾼다.",
            "결제 수단 단계 안에서 영수증 받는 방법과 결제 수단을 짧게 이동하며 바꾼다.",
            "제출 확인 단계로 한 번만 이동하면 바로 신청을 끝낼 수 있다."
          ],
          "structural": {
            "totals": {
              "navMoves": 12,
              "activations": 1,
              "decisions": 5,
              "waits": 1,
              "speechUnits": 5,
              "scanSteps": 12,
              "contextResets": 0
            },
            "byBucket": {
              "entry": {
                "navMoves": 5,
                "activations": 0,
                "decisions": 2,
                "waits": 0,
                "speechUnits": 2,
                "scanSteps": 5,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 7,
                "activations": 1,
                "decisions": 3,
                "waits": 1,
                "speechUnits": 3,
                "scanSteps": 7,
                "contextResets": 0
              },
              "recovery": {
                "navMoves": 0,
                "activations": 0,
                "decisions": 0,
                "waits": 0,
                "speechUnits": 0,
                "scanSteps": 0,
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
                  "milliseconds": 7840,
                  "seconds": 7.8
                },
                "expected": {
                  "milliseconds": 11590,
                  "seconds": 11.6
                },
                "upper": {
                  "milliseconds": 16320,
                  "seconds": 16.3
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 3090,
                    "seconds": 3.1
                  },
                  "repeated": {
                    "milliseconds": 4750,
                    "seconds": 4.8
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 4550,
                    "seconds": 4.5
                  },
                  "repeated": {
                    "milliseconds": 7040,
                    "seconds": 7
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 6400,
                    "seconds": 6.4
                  },
                  "repeated": {
                    "milliseconds": 9920,
                    "seconds": 9.9
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                }
              }
            },
            "screenReader": {
              "label": "화면낭독 사용자",
              "description": "키보드 비용에 발화 청취와 문맥 재구축 비용을 더한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 13080,
                  "seconds": 13.1
                },
                "expected": {
                  "milliseconds": 18560,
                  "seconds": 18.6
                },
                "upper": {
                  "milliseconds": 25990,
                  "seconds": 26
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 5220,
                    "seconds": 5.2
                  },
                  "repeated": {
                    "milliseconds": 7860,
                    "seconds": 7.9
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 7380,
                    "seconds": 7.4
                  },
                  "repeated": {
                    "milliseconds": 11180,
                    "seconds": 11.2
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 10330,
                    "seconds": 10.3
                  },
                  "repeated": {
                    "milliseconds": 15660,
                    "seconds": 15.7
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                }
              }
            },
            "switch": {
              "label": "스위치 사용자",
              "description": "자동 스캔 기반 순차 입력을 가정한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 15220,
                  "seconds": 15.2
                },
                "expected": {
                  "milliseconds": 22500,
                  "seconds": 22.5
                },
                "upper": {
                  "milliseconds": 33570,
                  "seconds": 33.6
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 5950,
                    "seconds": 6
                  },
                  "repeated": {
                    "milliseconds": 9270,
                    "seconds": 9.3
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 8800,
                    "seconds": 8.8
                  },
                  "repeated": {
                    "milliseconds": 13700,
                    "seconds": 13.7
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 13200,
                    "seconds": 13.2
                  },
                  "repeated": {
                    "milliseconds": 20370,
                    "seconds": 20.4
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
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
    "task1_remote_contact_card_submit": {
      "keyboard": {
        "expectedReductionSeconds": 27.7,
        "expectedReductionPercent": 65.2
      },
      "screenReader": {
        "expectedReductionSeconds": 45,
        "expectedReductionPercent": 65.2
      },
      "switch": {
        "expectedReductionSeconds": 66,
        "expectedReductionPercent": 68.4
      }
    },
    "task2_guardian_help_bank_submit": {
      "keyboard": {
        "expectedReductionSeconds": 32.9,
        "expectedReductionPercent": 63.3
      },
      "screenReader": {
        "expectedReductionSeconds": 59.6,
        "expectedReductionPercent": 64.9
      },
      "switch": {
        "expectedReductionSeconds": 86.4,
        "expectedReductionPercent": 67.3
      }
    },
    "task3_return_receipt_easy_submit": {
      "keyboard": {
        "expectedReductionSeconds": 29.5,
        "expectedReductionPercent": 71.8
      },
      "screenReader": {
        "expectedReductionSeconds": 48.2,
        "expectedReductionPercent": 72.2
      },
      "switch": {
        "expectedReductionSeconds": 71.7,
        "expectedReductionPercent": 76.1
      }
    }
  },
  "overall": {
    "keyboard": {
      "label": "키보드 사용자",
      "variantAExpectedSeconds": 135.6,
      "variantBExpectedSeconds": 45.5,
      "expectedReductionSeconds": 90.1,
      "expectedReductionPercent": 66.4
    },
    "screenReader": {
      "label": "화면낭독 사용자",
      "variantAExpectedSeconds": 227.6,
      "variantBExpectedSeconds": 74.8,
      "expectedReductionSeconds": 152.8,
      "expectedReductionPercent": 67.1
    },
    "switch": {
      "label": "스위치 사용자",
      "variantAExpectedSeconds": 319,
      "variantBExpectedSeconds": 94.9,
      "expectedReductionSeconds": 224.1,
      "expectedReductionPercent": 70.3
    }
  },
  "measurementRules": [
    "실제 계측은 수행 탭에서 첫 조작이 들어갈 때 시작합니다.",
    "수행 탭이 숨겨져 있는 동안의 시간은 실제 완료 시간에서 제외합니다.",
    "수행 탭 맨 아래의 보조 버튼 조작은 실제 지표에서 제외합니다."
  ],
  "actualMeasurementScope": "과업 내용 확인은 메인 창에서 진행하고, 새 탭의 실제 신청·결제 항목 선택과 제출 조작만 기록합니다."
};
