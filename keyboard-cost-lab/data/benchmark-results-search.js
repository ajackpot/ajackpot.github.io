export const benchmarkResultsSearch = {
  "generatedAt": "2026-04-01T00:15:01.182Z",
  "variants": {
    "variantA": {
      "label": "비교안 A · 조작 부담이 큰 구조",
      "description": "상단 보조 링크와 정렬·자료 범위 선택을 지난 뒤 검색 결과에 도달하고, 결과마다 제목 링크·갱신 시각·공유·저장·바로 열기·미리보기 등을 각각 지나야 하며, 미리보기 대화상자를 닫으면 검색 결과 제목 근처부터 다시 찾게 되는 구조.",
      "tasks": {
        "task1_newest_guide_preview_close": {
          "title": "최신 안내문에서 예약 변경 안내 미리보기 열었다가 닫기",
          "assumptions": [
            "상단 보조 링크와 도움 링크를 지나 정렬·자료 범위를 먼저 맞춰야 한다.",
            "결과마다 제목 링크, 갱신 시각 링크, 공유 링크, 저장, 바로 열기, 미리보기가 따로 있어 순차 이동이 길어진다.",
            "미리보기 대화상자를 닫으면 원래 자료 카드 대신 검색 결과 제목 근처로 돌아와 다시 위치를 잡아야 한다."
          ],
          "structural": {
            "totals": {
              "navMoves": 45,
              "activations": 4,
              "decisions": 14,
              "waits": 1,
              "speechUnits": 23,
              "scanSteps": 54,
              "contextResets": 1
            },
            "byBucket": {
              "entry": {
                "navMoves": 28,
                "activations": 2,
                "decisions": 7,
                "waits": 1,
                "speechUnits": 13,
                "scanSteps": 33,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 13,
                "activations": 1,
                "decisions": 5,
                "waits": 0,
                "speechUnits": 8,
                "scanSteps": 16,
                "contextResets": 0
              },
              "recovery": {
                "navMoves": 4,
                "activations": 1,
                "decisions": 2,
                "waits": 0,
                "speechUnits": 2,
                "scanSteps": 5,
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
                  "milliseconds": 27416,
                  "seconds": 27.4
                },
                "expected": {
                  "milliseconds": 40905,
                  "seconds": 40.9
                },
                "upper": {
                  "milliseconds": 58598,
                  "seconds": 58.6
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 16100,
                    "seconds": 16.1
                  },
                  "repeated": {
                    "milliseconds": 8170,
                    "seconds": 8.2
                  },
                  "recovery": {
                    "milliseconds": 3146,
                    "seconds": 3.1
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 23610,
                    "seconds": 23.6
                  },
                  "repeated": {
                    "milliseconds": 12020,
                    "seconds": 12
                  },
                  "recovery": {
                    "milliseconds": 5275,
                    "seconds": 5.3
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 33070,
                    "seconds": 33.1
                  },
                  "repeated": {
                    "milliseconds": 16900,
                    "seconds": 16.9
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
                  "milliseconds": 48176,
                  "seconds": 48.2
                },
                "expected": {
                  "milliseconds": 70441,
                  "seconds": 70.4
                },
                "upper": {
                  "milliseconds": 101490,
                  "seconds": 101.5
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 27220,
                    "seconds": 27.2
                  },
                  "repeated": {
                    "milliseconds": 14140,
                    "seconds": 14.1
                  },
                  "recovery": {
                    "milliseconds": 6816,
                    "seconds": 6.8
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 38540,
                    "seconds": 38.5
                  },
                  "repeated": {
                    "milliseconds": 20040,
                    "seconds": 20
                  },
                  "recovery": {
                    "milliseconds": 11861,
                    "seconds": 11.9
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 53730,
                    "seconds": 53.7
                  },
                  "repeated": {
                    "milliseconds": 28040,
                    "seconds": 28
                  },
                  "recovery": {
                    "milliseconds": 19720,
                    "seconds": 19.7
                  }
                }
              }
            },
            "switch": {
              "label": "스위치 사용자",
              "description": "자동 스캔 기반 순차 입력을 가정한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 64615,
                  "seconds": 64.6
                },
                "expected": {
                  "milliseconds": 98697,
                  "seconds": 98.7
                },
                "upper": {
                  "milliseconds": 153770,
                  "seconds": 153.8
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 37070,
                    "seconds": 37.1
                  },
                  "repeated": {
                    "milliseconds": 18900,
                    "seconds": 18.9
                  },
                  "recovery": {
                    "milliseconds": 8645,
                    "seconds": 8.6
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 54680,
                    "seconds": 54.7
                  },
                  "repeated": {
                    "milliseconds": 27880,
                    "seconds": 27.9
                  },
                  "recovery": {
                    "milliseconds": 16137,
                    "seconds": 16.1
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 81670,
                    "seconds": 81.7
                  },
                  "repeated": {
                    "milliseconds": 41650,
                    "seconds": 41.6
                  },
                  "recovery": {
                    "milliseconds": 30450,
                    "seconds": 30.4
                  }
                }
              }
            }
          }
        },
        "task2_title_faq_save_remote": {
          "title": "제목순 질문답변에서 비대면 상담 연결 방법 저장",
          "assumptions": [
            "정렬 기준과 자료 범위를 다시 맞춘 뒤 검색 결과 앞부분부터 목표 자료를 찾아야 한다.",
            "자료마다 여러 링크와 버튼이 분산되어 있어 저장 버튼까지 가기 전 반복 이동이 길다.",
            "정확도순에서 제목순으로 바꾸면 사용자는 현재 위치를 다시 확인해야 한다."
          ],
          "structural": {
            "totals": {
              "navMoves": 34,
              "activations": 3,
              "decisions": 11,
              "waits": 1,
              "speechUnits": 18,
              "scanSteps": 41,
              "contextResets": 0
            },
            "byBucket": {
              "entry": {
                "navMoves": 20,
                "activations": 2,
                "decisions": 5,
                "waits": 1,
                "speechUnits": 9,
                "scanSteps": 24,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 14,
                "activations": 1,
                "decisions": 6,
                "waits": 0,
                "speechUnits": 9,
                "scanSteps": 17,
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
                  "milliseconds": 20700,
                  "seconds": 20.7
                },
                "expected": {
                  "milliseconds": 30430,
                  "seconds": 30.4
                },
                "upper": {
                  "milliseconds": 42720,
                  "seconds": 42.7
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 11660,
                    "seconds": 11.7
                  },
                  "repeated": {
                    "milliseconds": 9040,
                    "seconds": 9
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 17110,
                    "seconds": 17.1
                  },
                  "repeated": {
                    "milliseconds": 13320,
                    "seconds": 13.3
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 23970,
                    "seconds": 24
                  },
                  "repeated": {
                    "milliseconds": 18750,
                    "seconds": 18.8
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
                  "milliseconds": 35280,
                  "seconds": 35.3
                },
                "expected": {
                  "milliseconds": 50000,
                  "seconds": 50
                },
                "upper": {
                  "milliseconds": 69850,
                  "seconds": 69.8
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 19580,
                    "seconds": 19.6
                  },
                  "repeated": {
                    "milliseconds": 15700,
                    "seconds": 15.7
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 27740,
                    "seconds": 27.7
                  },
                  "repeated": {
                    "milliseconds": 22260,
                    "seconds": 22.3
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 38670,
                    "seconds": 38.7
                  },
                  "repeated": {
                    "milliseconds": 31180,
                    "seconds": 31.2
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
                  "milliseconds": 47770,
                  "seconds": 47.8
                },
                "expected": {
                  "milliseconds": 70460,
                  "seconds": 70.5
                },
                "upper": {
                  "milliseconds": 105170,
                  "seconds": 105.2
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 27320,
                    "seconds": 27.3
                  },
                  "repeated": {
                    "milliseconds": 20450,
                    "seconds": 20.4
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 40280,
                    "seconds": 40.3
                  },
                  "repeated": {
                    "milliseconds": 30180,
                    "seconds": 30.2
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 60070,
                    "seconds": 60.1
                  },
                  "repeated": {
                    "milliseconds": 45100,
                    "seconds": 45.1
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
        "task3_form_preview_then_open": {
          "title": "신청 서식에서 상담 준비 체크 목록 미리보기 후 바로 열기",
          "assumptions": [
            "자료 범위를 신청 서식으로 바꾼 뒤에도 검색 결과 앞부분부터 원하는 자료를 다시 찾아야 한다.",
            "미리보기 대화상자를 닫으면 원래 자료 카드의 버튼으로 돌아가지 않아 바로 열기 버튼을 다시 찾아야 한다.",
            "순차 탐색 구조에서는 자료 수가 줄어도 각 자료 안의 버튼 수 때문에 비용이 크게 남는다."
          ],
          "structural": {
            "totals": {
              "navMoves": 38,
              "activations": 4,
              "decisions": 13,
              "waits": 1,
              "speechUnits": 20,
              "scanSteps": 46,
              "contextResets": 2
            },
            "byBucket": {
              "entry": {
                "navMoves": 17,
                "activations": 1,
                "decisions": 4,
                "waits": 1,
                "speechUnits": 8,
                "scanSteps": 21,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 10,
                "activations": 1,
                "decisions": 4,
                "waits": 0,
                "speechUnits": 6,
                "scanSteps": 12,
                "contextResets": 0
              },
              "recovery": {
                "navMoves": 11,
                "activations": 2,
                "decisions": 5,
                "waits": 0,
                "speechUnits": 6,
                "scanSteps": 13,
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
                  "milliseconds": 24309,
                  "seconds": 24.3
                },
                "expected": {
                  "milliseconds": 37411,
                  "seconds": 37.4
                },
                "upper": {
                  "milliseconds": 55668,
                  "seconds": 55.7
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 9670,
                    "seconds": 9.7
                  },
                  "repeated": {
                    "milliseconds": 6400,
                    "seconds": 6.4
                  },
                  "recovery": {
                    "milliseconds": 8239,
                    "seconds": 8.2
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 14190,
                    "seconds": 14.2
                  },
                  "repeated": {
                    "milliseconds": 9420,
                    "seconds": 9.4
                  },
                  "recovery": {
                    "milliseconds": 13801,
                    "seconds": 13.8
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 19870,
                    "seconds": 19.9
                  },
                  "repeated": {
                    "milliseconds": 13250,
                    "seconds": 13.3
                  },
                  "recovery": {
                    "milliseconds": 22548,
                    "seconds": 22.5
                  }
                }
              }
            },
            "screenReader": {
              "label": "화면낭독 사용자",
              "description": "키보드 비용에 발화 청취와 문맥 재구축 비용을 더한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 44756,
                  "seconds": 44.8
                },
                "expected": {
                  "milliseconds": 68931,
                  "seconds": 68.9
                },
                "upper": {
                  "milliseconds": 104116,
                  "seconds": 104.1
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 16360,
                    "seconds": 16.4
                  },
                  "repeated": {
                    "milliseconds": 11020,
                    "seconds": 11
                  },
                  "recovery": {
                    "milliseconds": 17376,
                    "seconds": 17.4
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 23180,
                    "seconds": 23.2
                  },
                  "repeated": {
                    "milliseconds": 15620,
                    "seconds": 15.6
                  },
                  "recovery": {
                    "milliseconds": 30131,
                    "seconds": 30.1
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 32310,
                    "seconds": 32.3
                  },
                  "repeated": {
                    "milliseconds": 21860,
                    "seconds": 21.9
                  },
                  "recovery": {
                    "milliseconds": 49946,
                    "seconds": 49.9
                  }
                }
              }
            },
            "switch": {
              "label": "스위치 사용자",
              "description": "자동 스캔 기반 순차 입력을 가정한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 59445,
                  "seconds": 59.4
                },
                "expected": {
                  "milliseconds": 96269,
                  "seconds": 96.3
                },
                "upper": {
                  "milliseconds": 159985,
                  "seconds": 160
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 23170,
                    "seconds": 23.2
                  },
                  "repeated": {
                    "milliseconds": 14500,
                    "seconds": 14.5
                  },
                  "recovery": {
                    "milliseconds": 21775,
                    "seconds": 21.8
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 34200,
                    "seconds": 34.2
                  },
                  "repeated": {
                    "milliseconds": 21380,
                    "seconds": 21.4
                  },
                  "recovery": {
                    "milliseconds": 40689,
                    "seconds": 40.7
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 51120,
                    "seconds": 51.1
                  },
                  "repeated": {
                    "milliseconds": 31900,
                    "seconds": 31.9
                  },
                  "recovery": {
                    "milliseconds": 76965,
                    "seconds": 77
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
      "description": "검색 결과로 바로 이동해 처음 진입 부담을 낮추고, 결과를 하나의 선택 항목으로 이동하며, 선택한 자료 작업을 한곳에 모으고, 미리보기 대화상자를 닫으면 바로 원래 작업 버튼으로 돌아오는 구조.",
      "tasks": {
        "task1_newest_guide_preview_close": {
          "title": "최신 안내문에서 예약 변경 안내 미리보기 열었다가 닫기",
          "assumptions": [
            "맨 앞의 검색 결과로 바로 이동 링크로 첫 진입 부담을 줄인다.",
            "결과는 하나의 선택 항목으로 제공되어 결과 안의 여러 링크와 버튼을 반복해 지나지 않는다.",
            "미리보기를 닫으면 같은 작업 버튼으로 초점이 돌아와 위치를 다시 찾는 비용을 줄인다."
          ],
          "structural": {
            "totals": {
              "navMoves": 13,
              "activations": 5,
              "decisions": 8,
              "waits": 1,
              "speechUnits": 10,
              "scanSteps": 16,
              "contextResets": 0
            },
            "byBucket": {
              "entry": {
                "navMoves": 8,
                "activations": 3,
                "decisions": 5,
                "waits": 1,
                "speechUnits": 7,
                "scanSteps": 11,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 3,
                "activations": 1,
                "decisions": 2,
                "waits": 0,
                "speechUnits": 2,
                "scanSteps": 3,
                "contextResets": 0
              },
              "recovery": {
                "navMoves": 2,
                "activations": 1,
                "decisions": 1,
                "waits": 0,
                "speechUnits": 1,
                "scanSteps": 2,
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
                  "milliseconds": 10584,
                  "seconds": 10.6
                },
                "expected": {
                  "milliseconds": 16038,
                  "seconds": 16
                },
                "upper": {
                  "milliseconds": 23310,
                  "seconds": 23.3
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 6480,
                    "seconds": 6.5
                  },
                  "repeated": {
                    "milliseconds": 2410,
                    "seconds": 2.4
                  },
                  "recovery": {
                    "milliseconds": 1694,
                    "seconds": 1.7
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 9630,
                    "seconds": 9.6
                  },
                  "repeated": {
                    "milliseconds": 3570,
                    "seconds": 3.6
                  },
                  "recovery": {
                    "milliseconds": 2838,
                    "seconds": 2.8
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 13620,
                    "seconds": 13.6
                  },
                  "repeated": {
                    "milliseconds": 5050,
                    "seconds": 5
                  },
                  "recovery": {
                    "milliseconds": 4640,
                    "seconds": 4.6
                  }
                }
              }
            },
            "screenReader": {
              "label": "화면낭독 사용자",
              "description": "키보드 비용에 발화 청취와 문맥 재구축 비용을 더한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 18224,
                  "seconds": 18.2
                },
                "expected": {
                  "milliseconds": 26871,
                  "seconds": 26.9
                },
                "upper": {
                  "milliseconds": 38977,
                  "seconds": 39
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 11120,
                    "seconds": 11.1
                  },
                  "repeated": {
                    "milliseconds": 4080,
                    "seconds": 4.1
                  },
                  "recovery": {
                    "milliseconds": 3024,
                    "seconds": 3
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 15880,
                    "seconds": 15.9
                  },
                  "repeated": {
                    "milliseconds": 5800,
                    "seconds": 5.8
                  },
                  "recovery": {
                    "milliseconds": 5191,
                    "seconds": 5.2
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 22310,
                    "seconds": 22.3
                  },
                  "repeated": {
                    "milliseconds": 8150,
                    "seconds": 8.2
                  },
                  "recovery": {
                    "milliseconds": 8517,
                    "seconds": 8.5
                  }
                }
              }
            },
            "switch": {
              "label": "스위치 사용자",
              "description": "자동 스캔 기반 순차 입력을 가정한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 24580,
                  "seconds": 24.6
                },
                "expected": {
                  "milliseconds": 37762,
                  "seconds": 37.8
                },
                "upper": {
                  "milliseconds": 58755,
                  "seconds": 58.8
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 15670,
                    "seconds": 15.7
                  },
                  "repeated": {
                    "milliseconds": 4750,
                    "seconds": 4.8
                  },
                  "recovery": {
                    "milliseconds": 4160,
                    "seconds": 4.2
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 23060,
                    "seconds": 23.1
                  },
                  "repeated": {
                    "milliseconds": 6980,
                    "seconds": 7
                  },
                  "recovery": {
                    "milliseconds": 7722,
                    "seconds": 7.7
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 34070,
                    "seconds": 34.1
                  },
                  "repeated": {
                    "milliseconds": 10300,
                    "seconds": 10.3
                  },
                  "recovery": {
                    "milliseconds": 14385,
                    "seconds": 14.4
                  }
                }
              }
            }
          }
        },
        "task2_title_faq_save_remote": {
          "title": "제목순 질문답변에서 비대면 상담 연결 방법 저장",
          "assumptions": [
            "제목순과 질문답변 필터를 적용하면 검색 결과 제목으로 초점이 이동해 다시 읽을 위치가 분명하다.",
            "질문답변 사이 이동은 방향키 중심이라 짧게 끝난다.",
            "저장, 미리보기, 바로 열기를 선택한 자료 작업 영역에 모아 둔다."
          ],
          "structural": {
            "totals": {
              "navMoves": 9,
              "activations": 3,
              "decisions": 7,
              "waits": 1,
              "speechUnits": 7,
              "scanSteps": 12,
              "contextResets": 0
            },
            "byBucket": {
              "entry": {
                "navMoves": 5,
                "activations": 2,
                "decisions": 4,
                "waits": 1,
                "speechUnits": 4,
                "scanSteps": 7,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 4,
                "activations": 1,
                "decisions": 3,
                "waits": 0,
                "speechUnits": 3,
                "scanSteps": 5,
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
                  "milliseconds": 7770,
                  "seconds": 7.8
                },
                "expected": {
                  "milliseconds": 11580,
                  "seconds": 11.6
                },
                "upper": {
                  "milliseconds": 16420,
                  "seconds": 16.4
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 4490,
                    "seconds": 4.5
                  },
                  "repeated": {
                    "milliseconds": 3280,
                    "seconds": 3.3
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 6710,
                    "seconds": 6.7
                  },
                  "repeated": {
                    "milliseconds": 4870,
                    "seconds": 4.9
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 9520,
                    "seconds": 9.5
                  },
                  "repeated": {
                    "milliseconds": 6900,
                    "seconds": 6.9
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
                  "milliseconds": 13220,
                  "seconds": 13.2
                },
                "expected": {
                  "milliseconds": 18860,
                  "seconds": 18.9
                },
                "upper": {
                  "milliseconds": 26560,
                  "seconds": 26.6
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 7580,
                    "seconds": 7.6
                  },
                  "repeated": {
                    "milliseconds": 5640,
                    "seconds": 5.6
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 10840,
                    "seconds": 10.8
                  },
                  "repeated": {
                    "milliseconds": 8020,
                    "seconds": 8
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 15270,
                    "seconds": 15.3
                  },
                  "repeated": {
                    "milliseconds": 11290,
                    "seconds": 11.3
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
                  "milliseconds": 17820,
                  "seconds": 17.8
                },
                "expected": {
                  "milliseconds": 26260,
                  "seconds": 26.3
                },
                "upper": {
                  "milliseconds": 38870,
                  "seconds": 38.9
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 10570,
                    "seconds": 10.6
                  },
                  "repeated": {
                    "milliseconds": 7250,
                    "seconds": 7.3
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 15580,
                    "seconds": 15.6
                  },
                  "repeated": {
                    "milliseconds": 10680,
                    "seconds": 10.7
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 23020,
                    "seconds": 23
                  },
                  "repeated": {
                    "milliseconds": 15850,
                    "seconds": 15.8
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
        "task3_form_preview_then_open": {
          "title": "신청 서식에서 상담 준비 체크 목록 미리보기 후 바로 열기",
          "assumptions": [
            "자료 범위를 신청 서식으로 바꾸면 검색 결과 제목으로 초점이 이동해 현재 범위를 다시 확인하기 쉽다.",
            "서식 사이 이동은 방향키 중심이라 짧게 끝난다.",
            "미리보기를 닫으면 같은 작업 버튼으로 돌아와 바로 열기까지 이어서 수행할 수 있다."
          ],
          "structural": {
            "totals": {
              "navMoves": 10,
              "activations": 4,
              "decisions": 7,
              "waits": 1,
              "speechUnits": 7,
              "scanSteps": 11,
              "contextResets": 0
            },
            "byBucket": {
              "entry": {
                "navMoves": 4,
                "activations": 1,
                "decisions": 3,
                "waits": 1,
                "speechUnits": 3,
                "scanSteps": 5,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 3,
                "activations": 1,
                "decisions": 2,
                "waits": 0,
                "speechUnits": 2,
                "scanSteps": 3,
                "contextResets": 0
              },
              "recovery": {
                "navMoves": 3,
                "activations": 2,
                "decisions": 2,
                "waits": 0,
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
                  "milliseconds": 8703,
                  "seconds": 8.7
                },
                "expected": {
                  "milliseconds": 13523,
                  "seconds": 13.5
                },
                "upper": {
                  "milliseconds": 20245,
                  "seconds": 20.2
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 3400,
                    "seconds": 3.4
                  },
                  "repeated": {
                    "milliseconds": 2410,
                    "seconds": 2.4
                  },
                  "recovery": {
                    "milliseconds": 2893,
                    "seconds": 2.9
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 5090,
                    "seconds": 5.1
                  },
                  "repeated": {
                    "milliseconds": 3570,
                    "seconds": 3.6
                  },
                  "recovery": {
                    "milliseconds": 4863,
                    "seconds": 4.9
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 7220,
                    "seconds": 7.2
                  },
                  "repeated": {
                    "milliseconds": 5050,
                    "seconds": 5
                  },
                  "recovery": {
                    "milliseconds": 7975,
                    "seconds": 8
                  }
                }
              }
            },
            "screenReader": {
              "label": "화면낭독 사용자",
              "description": "키보드 비용에 발화 청취와 문맥 재구축 비용을 더한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 15048,
                  "seconds": 15
                },
                "expected": {
                  "milliseconds": 23001,
                  "seconds": 23
                },
                "upper": {
                  "milliseconds": 34499,
                  "seconds": 34.5
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 5760,
                    "seconds": 5.8
                  },
                  "repeated": {
                    "milliseconds": 4080,
                    "seconds": 4.1
                  },
                  "recovery": {
                    "milliseconds": 5208,
                    "seconds": 5.2
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 8240,
                    "seconds": 8.2
                  },
                  "repeated": {
                    "milliseconds": 5800,
                    "seconds": 5.8
                  },
                  "recovery": {
                    "milliseconds": 8961,
                    "seconds": 9
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 11610,
                    "seconds": 11.6
                  },
                  "repeated": {
                    "milliseconds": 8150,
                    "seconds": 8.2
                  },
                  "recovery": {
                    "milliseconds": 14739,
                    "seconds": 14.7
                  }
                }
              }
            },
            "switch": {
              "label": "스위치 사용자",
              "description": "자동 스캔 기반 순차 입력을 가정한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 19205,
                  "seconds": 19.2
                },
                "expected": {
                  "milliseconds": 31014,
                  "seconds": 31
                },
                "upper": {
                  "milliseconds": 50830,
                  "seconds": 50.8
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 7370,
                    "seconds": 7.4
                  },
                  "repeated": {
                    "milliseconds": 4750,
                    "seconds": 4.8
                  },
                  "recovery": {
                    "milliseconds": 7085,
                    "seconds": 7.1
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 10900,
                    "seconds": 10.9
                  },
                  "repeated": {
                    "milliseconds": 6980,
                    "seconds": 7
                  },
                  "recovery": {
                    "milliseconds": 13134,
                    "seconds": 13.1
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 16170,
                    "seconds": 16.2
                  },
                  "repeated": {
                    "milliseconds": 10300,
                    "seconds": 10.3
                  },
                  "recovery": {
                    "milliseconds": 24360,
                    "seconds": 24.4
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
    "task1_newest_guide_preview_close": {
      "keyboard": {
        "expectedReductionSeconds": 24.9,
        "expectedReductionPercent": 60.9
      },
      "screenReader": {
        "expectedReductionSeconds": 43.5,
        "expectedReductionPercent": 61.8
      },
      "switch": {
        "expectedReductionSeconds": 60.9,
        "expectedReductionPercent": 61.7
      }
    },
    "task2_title_faq_save_remote": {
      "keyboard": {
        "expectedReductionSeconds": 18.8,
        "expectedReductionPercent": 61.8
      },
      "screenReader": {
        "expectedReductionSeconds": 31.1,
        "expectedReductionPercent": 62.2
      },
      "switch": {
        "expectedReductionSeconds": 44.2,
        "expectedReductionPercent": 62.7
      }
    },
    "task3_form_preview_then_open": {
      "keyboard": {
        "expectedReductionSeconds": 23.9,
        "expectedReductionPercent": 63.9
      },
      "screenReader": {
        "expectedReductionSeconds": 45.9,
        "expectedReductionPercent": 66.6
      },
      "switch": {
        "expectedReductionSeconds": 65.3,
        "expectedReductionPercent": 67.8
      }
    }
  },
  "overall": {
    "keyboard": {
      "label": "키보드 사용자",
      "variantAExpectedSeconds": 108.7,
      "variantBExpectedSeconds": 41.1,
      "expectedReductionSeconds": 67.6,
      "expectedReductionPercent": 62.2
    },
    "screenReader": {
      "label": "화면낭독 사용자",
      "variantAExpectedSeconds": 189.3,
      "variantBExpectedSeconds": 68.8,
      "expectedReductionSeconds": 120.5,
      "expectedReductionPercent": 63.7
    },
    "switch": {
      "label": "스위치 사용자",
      "variantAExpectedSeconds": 265.5,
      "variantBExpectedSeconds": 95.1,
      "expectedReductionSeconds": 170.4,
      "expectedReductionPercent": 64.2
    }
  },
  "measurementRules": [
    "실제 계측은 수행 탭에서 첫 조작이 들어갈 때 시작합니다.",
    "수행 탭이 숨겨져 있는 동안의 시간은 실제 완료 시간에서 제외합니다.",
    "수행 탭 맨 아래의 보조 버튼 조작은 실제 지표에서 제외합니다."
  ],
  "actualMeasurementScope": "과업 내용 확인은 메인 창에서 진행하고, 새 탭의 실제 검색 결과 목록 조작만 기록합니다."
};
