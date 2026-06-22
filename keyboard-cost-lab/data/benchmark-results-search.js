export const benchmarkResultsSearch = {
  "generatedAt": "2026-06-22T09:00:37.099Z",
  "variants": {
    "variantA": {
      "label": "비교안 A · 조작 부담이 큰 구조",
      "description": "상단 검색 기능과 조건 선택을 지나 결과에 도달하고, 결과마다 저장·열기·미리보기·정보 링크가 반복되는 구조.",
      "tasks": {
        "task1_newest_guide_preview_answer": {
          "title": "최신 안내문 미리보기에서 예약 변경 기준 확인",
          "assumptions": [
            "상단 보조 메뉴와 검색 입력을 지나 조건 선택 영역에 도달해야 한다.",
            "결과마다 제목, 갱신 시각, 공유, 저장, 바로 열기, 미리보기를 차례로 지나야 한다.",
            "미리보기를 닫으면 결과 제목 근처부터 다시 위치를 확인해야 한다."
          ],
          "structural": {
            "totals": {
              "navMoves": 36,
              "activations": 4,
              "decisions": 11,
              "waits": 1,
              "speechUnits": 19,
              "scanSteps": 44,
              "contextResets": 1
            },
            "byBucket": {
              "entry": {
                "navMoves": 21,
                "activations": 2,
                "decisions": 5,
                "waits": 1,
                "speechUnits": 10,
                "scanSteps": 25,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 11,
                "activations": 1,
                "decisions": 4,
                "waits": 0,
                "speechUnits": 7,
                "scanSteps": 14,
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
                  "milliseconds": 22106,
                  "seconds": 22.1
                },
                "expected": {
                  "milliseconds": 33105,
                  "seconds": 33.1
                },
                "upper": {
                  "milliseconds": 47648,
                  "seconds": 47.6
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 12110,
                    "seconds": 12.1
                  },
                  "repeated": {
                    "milliseconds": 6850,
                    "seconds": 6.8
                  },
                  "recovery": {
                    "milliseconds": 3146,
                    "seconds": 3.1
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 17760,
                    "seconds": 17.8
                  },
                  "repeated": {
                    "milliseconds": 10070,
                    "seconds": 10.1
                  },
                  "recovery": {
                    "milliseconds": 5275,
                    "seconds": 5.3
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 24870,
                    "seconds": 24.9
                  },
                  "repeated": {
                    "milliseconds": 14150,
                    "seconds": 14.2
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
                  "milliseconds": 39136,
                  "seconds": 39.1
                },
                "expected": {
                  "milliseconds": 57661,
                  "seconds": 57.7
                },
                "upper": {
                  "milliseconds": 83630,
                  "seconds": 83.6
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 20440,
                    "seconds": 20.4
                  },
                  "repeated": {
                    "milliseconds": 11880,
                    "seconds": 11.9
                  },
                  "recovery": {
                    "milliseconds": 6816,
                    "seconds": 6.8
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 28960,
                    "seconds": 29
                  },
                  "repeated": {
                    "milliseconds": 16840,
                    "seconds": 16.8
                  },
                  "recovery": {
                    "milliseconds": 11861,
                    "seconds": 11.9
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 40360,
                    "seconds": 40.4
                  },
                  "repeated": {
                    "milliseconds": 23550,
                    "seconds": 23.6
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
                  "milliseconds": 53315,
                  "seconds": 53.3
                },
                "expected": {
                  "milliseconds": 81997,
                  "seconds": 82
                },
                "upper": {
                  "milliseconds": 128720,
                  "seconds": 128.7
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 28270,
                    "seconds": 28.3
                  },
                  "repeated": {
                    "milliseconds": 16400,
                    "seconds": 16.4
                  },
                  "recovery": {
                    "milliseconds": 8645,
                    "seconds": 8.6
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 41680,
                    "seconds": 41.7
                  },
                  "repeated": {
                    "milliseconds": 24180,
                    "seconds": 24.2
                  },
                  "recovery": {
                    "milliseconds": 16137,
                    "seconds": 16.1
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 62170,
                    "seconds": 62.2
                  },
                  "repeated": {
                    "milliseconds": 36100,
                    "seconds": 36.1
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
        "task2_title_faq_save_options": {
          "title": "제목순 질문답변에서 비대면 상담 연결 방법 저장",
          "assumptions": [
            "저장 버튼을 누른 뒤 저장 위치와 포함할 내용 선택지가 각각 초점을 받아 추가 탐색이 발생한다.",
            "결과 카드 안의 여러 링크와 버튼 때문에 목표 자료의 저장 버튼까지 순차 이동이 길다.",
            "저장 옵션 확인 뒤 다시 결과 영역으로 돌아오며 위치 확인 비용이 생긴다."
          ],
          "structural": {
            "totals": {
              "navMoves": 47,
              "activations": 6,
              "decisions": 16,
              "waits": 1,
              "speechUnits": 26,
              "scanSteps": 58,
              "contextResets": 1
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
                "navMoves": 23,
                "activations": 3,
                "decisions": 9,
                "waits": 0,
                "speechUnits": 15,
                "scanSteps": 29,
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
                  "milliseconds": 29596,
                  "seconds": 29.6
                },
                "expected": {
                  "milliseconds": 44145,
                  "seconds": 44.1
                },
                "upper": {
                  "milliseconds": 63198,
                  "seconds": 63.2
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 11660,
                    "seconds": 11.7
                  },
                  "repeated": {
                    "milliseconds": 14790,
                    "seconds": 14.8
                  },
                  "recovery": {
                    "milliseconds": 3146,
                    "seconds": 3.1
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 17110,
                    "seconds": 17.1
                  },
                  "repeated": {
                    "milliseconds": 21760,
                    "seconds": 21.8
                  },
                  "recovery": {
                    "milliseconds": 5275,
                    "seconds": 5.3
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 23970,
                    "seconds": 24
                  },
                  "repeated": {
                    "milliseconds": 30600,
                    "seconds": 30.6
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
                  "milliseconds": 51976,
                  "seconds": 52
                },
                "expected": {
                  "milliseconds": 75881,
                  "seconds": 75.9
                },
                "upper": {
                  "milliseconds": 109150,
                  "seconds": 109.2
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 19580,
                    "seconds": 19.6
                  },
                  "repeated": {
                    "milliseconds": 25580,
                    "seconds": 25.6
                  },
                  "recovery": {
                    "milliseconds": 6816,
                    "seconds": 6.8
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 27740,
                    "seconds": 27.7
                  },
                  "repeated": {
                    "milliseconds": 36280,
                    "seconds": 36.3
                  },
                  "recovery": {
                    "milliseconds": 11861,
                    "seconds": 11.9
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 38670,
                    "seconds": 38.7
                  },
                  "repeated": {
                    "milliseconds": 50760,
                    "seconds": 50.8
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
                  "milliseconds": 71015,
                  "seconds": 71
                },
                "expected": {
                  "milliseconds": 108057,
                  "seconds": 108.1
                },
                "upper": {
                  "milliseconds": 167470,
                  "seconds": 167.5
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 27320,
                    "seconds": 27.3
                  },
                  "repeated": {
                    "milliseconds": 35050,
                    "seconds": 35
                  },
                  "recovery": {
                    "milliseconds": 8645,
                    "seconds": 8.6
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 40280,
                    "seconds": 40.3
                  },
                  "repeated": {
                    "milliseconds": 51640,
                    "seconds": 51.6
                  },
                  "recovery": {
                    "milliseconds": 16137,
                    "seconds": 16.1
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 60070,
                    "seconds": 60.1
                  },
                  "repeated": {
                    "milliseconds": 76950,
                    "seconds": 77
                  },
                  "recovery": {
                    "milliseconds": 30450,
                    "seconds": 30.4
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
      "description": "검색 결과와 검색 조건으로 바로 이동하는 링크를 제공하고, 결과를 하나의 선택 항목으로 이동하며, 선택한 자료 작업을 한곳에 모은 구조.",
      "tasks": {
        "task1_newest_guide_preview_answer": {
          "title": "최신 안내문 미리보기에서 예약 변경 기준 확인",
          "assumptions": [
            "검색 결과 영역과 검색 조건 설정으로 바로 이동하는 링크가 있어 단일 페이지 안에서도 진입 비용을 줄인다.",
            "결과는 하나의 선택 항목으로 제공되어 자료 안의 여러 링크와 버튼을 반복해 지나지 않는다.",
            "미리보기를 닫으면 같은 작업 버튼으로 초점이 돌아온다."
          ],
          "structural": {
            "totals": {
              "navMoves": 11,
              "activations": 5,
              "decisions": 8,
              "waits": 1,
              "speechUnits": 10,
              "scanSteps": 15,
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
                "navMoves": 1,
                "activations": 0,
                "decisions": 1,
                "waits": 0,
                "speechUnits": 1,
                "scanSteps": 1,
                "contextResets": 0
              },
              "recovery": {
                "navMoves": 2,
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
                  "milliseconds": 9748,
                  "seconds": 9.7
                },
                "expected": {
                  "milliseconds": 14980,
                  "seconds": 15
                },
                "upper": {
                  "milliseconds": 22140,
                  "seconds": 22.1
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 6480,
                    "seconds": 6.5
                  },
                  "repeated": {
                    "milliseconds": 870,
                    "seconds": 0.9
                  },
                  "recovery": {
                    "milliseconds": 2398,
                    "seconds": 2.4
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 9630,
                    "seconds": 9.6
                  },
                  "repeated": {
                    "milliseconds": 1300,
                    "seconds": 1.3
                  },
                  "recovery": {
                    "milliseconds": 4050,
                    "seconds": 4
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 13620,
                    "seconds": 13.6
                  },
                  "repeated": {
                    "milliseconds": 1850,
                    "seconds": 1.9
                  },
                  "recovery": {
                    "milliseconds": 6670,
                    "seconds": 6.7
                  }
                }
              }
            },
            "screenReader": {
              "label": "화면낭독 사용자",
              "description": "키보드 비용에 발화 청취와 문맥 재구축 비용을 더한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 17048,
                  "seconds": 17
                },
                "expected": {
                  "milliseconds": 25640,
                  "seconds": 25.6
                },
                "upper": {
                  "milliseconds": 37894,
                  "seconds": 37.9
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 11120,
                    "seconds": 11.1
                  },
                  "repeated": {
                    "milliseconds": 1560,
                    "seconds": 1.6
                  },
                  "recovery": {
                    "milliseconds": 4368,
                    "seconds": 4.4
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 15880,
                    "seconds": 15.9
                  },
                  "repeated": {
                    "milliseconds": 2220,
                    "seconds": 2.2
                  },
                  "recovery": {
                    "milliseconds": 7540,
                    "seconds": 7.5
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 22310,
                    "seconds": 22.3
                  },
                  "repeated": {
                    "milliseconds": 3140,
                    "seconds": 3.1
                  },
                  "recovery": {
                    "milliseconds": 12444,
                    "seconds": 12.4
                  }
                }
              }
            },
            "switch": {
              "label": "스위치 사용자",
              "description": "자동 스캔 기반 순차 입력을 가정한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 24305,
                  "seconds": 24.3
                },
                "expected": {
                  "milliseconds": 38494,
                  "seconds": 38.5
                },
                "upper": {
                  "milliseconds": 61880,
                  "seconds": 61.9
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 15670,
                    "seconds": 15.7
                  },
                  "repeated": {
                    "milliseconds": 1550,
                    "seconds": 1.6
                  },
                  "recovery": {
                    "milliseconds": 7085,
                    "seconds": 7.1
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 23060,
                    "seconds": 23.1
                  },
                  "repeated": {
                    "milliseconds": 2300,
                    "seconds": 2.3
                  },
                  "recovery": {
                    "milliseconds": 13134,
                    "seconds": 13.1
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 34070,
                    "seconds": 34.1
                  },
                  "repeated": {
                    "milliseconds": 3450,
                    "seconds": 3.5
                  },
                  "recovery": {
                    "milliseconds": 24360,
                    "seconds": 24.4
                  }
                }
              }
            }
          }
        },
        "task2_title_faq_save_options": {
          "title": "제목순 질문답변에서 비대면 상담 연결 방법 저장",
          "assumptions": [
            "조건 설정으로 바로 이동한 뒤 결과 제목으로 초점이 이동해 위치가 분명하다.",
            "선택한 자료 작업 영역에 저장이 있어 반복 카드 버튼을 지나지 않는다.",
            "저장 옵션은 일반 폼 요소로 묶여 있어 필요한 값만 짧게 선택한다."
          ],
          "structural": {
            "totals": {
              "navMoves": 15,
              "activations": 7,
              "decisions": 11,
              "waits": 1,
              "speechUnits": 13,
              "scanSteps": 21,
              "contextResets": 0
            },
            "byBucket": {
              "entry": {
                "navMoves": 7,
                "activations": 3,
                "decisions": 4,
                "waits": 1,
                "speechUnits": 6,
                "scanSteps": 10,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 7,
                "activations": 3,
                "decisions": 6,
                "waits": 0,
                "speechUnits": 6,
                "scanSteps": 10,
                "contextResets": 0
              },
              "recovery": {
                "navMoves": 1,
                "activations": 1,
                "decisions": 1,
                "waits": 0,
                "speechUnits": 1,
                "scanSteps": 1,
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
                  "milliseconds": 13139,
                  "seconds": 13.1
                },
                "expected": {
                  "milliseconds": 19765,
                  "seconds": 19.8
                },
                "upper": {
                  "milliseconds": 28455,
                  "seconds": 28.5
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 5610,
                    "seconds": 5.6
                  },
                  "repeated": {
                    "milliseconds": 6330,
                    "seconds": 6.3
                  },
                  "recovery": {
                    "milliseconds": 1199,
                    "seconds": 1.2
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 8330,
                    "seconds": 8.3
                  },
                  "repeated": {
                    "milliseconds": 9410,
                    "seconds": 9.4
                  },
                  "recovery": {
                    "milliseconds": 2025,
                    "seconds": 2
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 11770,
                    "seconds": 11.8
                  },
                  "repeated": {
                    "milliseconds": 13350,
                    "seconds": 13.3
                  },
                  "recovery": {
                    "milliseconds": 3335,
                    "seconds": 3.3
                  }
                }
              }
            },
            "screenReader": {
              "label": "화면낭독 사용자",
              "description": "키보드 비용에 발화 청취와 문맥 재구축 비용을 더한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 22584,
                  "seconds": 22.6
                },
                "expected": {
                  "milliseconds": 32870,
                  "seconds": 32.9
                },
                "upper": {
                  "milliseconds": 47142,
                  "seconds": 47.1
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 9560,
                    "seconds": 9.6
                  },
                  "repeated": {
                    "milliseconds": 10840,
                    "seconds": 10.8
                  },
                  "recovery": {
                    "milliseconds": 2184,
                    "seconds": 2.2
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 13660,
                    "seconds": 13.7
                  },
                  "repeated": {
                    "milliseconds": 15440,
                    "seconds": 15.4
                  },
                  "recovery": {
                    "milliseconds": 3770,
                    "seconds": 3.8
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 19170,
                    "seconds": 19.2
                  },
                  "repeated": {
                    "milliseconds": 21750,
                    "seconds": 21.8
                  },
                  "recovery": {
                    "milliseconds": 6222,
                    "seconds": 6.2
                  }
                }
              }
            },
            "switch": {
              "label": "스위치 사용자",
              "description": "자동 스캔 기반 순차 입력을 가정한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 32245,
                  "seconds": 32.2
                },
                "expected": {
                  "milliseconds": 48512,
                  "seconds": 48.5
                },
                "upper": {
                  "milliseconds": 73595,
                  "seconds": 73.6
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 14120,
                    "seconds": 14.1
                  },
                  "repeated": {
                    "milliseconds": 15200,
                    "seconds": 15.2
                  },
                  "recovery": {
                    "milliseconds": 2925,
                    "seconds": 2.9
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 20760,
                    "seconds": 20.8
                  },
                  "repeated": {
                    "milliseconds": 22340,
                    "seconds": 22.3
                  },
                  "recovery": {
                    "milliseconds": 5412,
                    "seconds": 5.4
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 30620,
                    "seconds": 30.6
                  },
                  "repeated": {
                    "milliseconds": 33000,
                    "seconds": 33
                  },
                  "recovery": {
                    "milliseconds": 9975,
                    "seconds": 10
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
    "task1_newest_guide_preview_answer": {
      "keyboard": {
        "expectedReductionSeconds": 18.1,
        "expectedReductionPercent": 54.7
      },
      "screenReader": {
        "expectedReductionSeconds": 32.1,
        "expectedReductionPercent": 55.6
      },
      "switch": {
        "expectedReductionSeconds": 43.5,
        "expectedReductionPercent": 53
      }
    },
    "task2_title_faq_save_options": {
      "keyboard": {
        "expectedReductionSeconds": 24.3,
        "expectedReductionPercent": 55.1
      },
      "screenReader": {
        "expectedReductionSeconds": 43,
        "expectedReductionPercent": 56.7
      },
      "switch": {
        "expectedReductionSeconds": 59.6,
        "expectedReductionPercent": 55.1
      }
    }
  },
  "overall": {
    "keyboard": {
      "label": "키보드 사용자",
      "variantAExpectedSeconds": 77.2,
      "variantBExpectedSeconds": 34.8,
      "expectedReductionSeconds": 42.4,
      "expectedReductionPercent": 54.9
    },
    "screenReader": {
      "label": "화면낭독 사용자",
      "variantAExpectedSeconds": 133.6,
      "variantBExpectedSeconds": 58.5,
      "expectedReductionSeconds": 75.1,
      "expectedReductionPercent": 56.2
    },
    "switch": {
      "label": "스위치 사용자",
      "variantAExpectedSeconds": 190.1,
      "variantBExpectedSeconds": 87,
      "expectedReductionSeconds": 103.1,
      "expectedReductionPercent": 54.2
    }
  },
  "measurementRules": [
    "실제 계측은 과업 수행 페이지에서 첫 조작이 들어갈 때 시작합니다.",
    "과업 수행 페이지가 보이지 않는 동안의 시간은 실제 완료 시간에서 제외합니다.",
    "과업 수행 페이지 맨 아래의 보조 버튼 조작은 실제 지표에서 제외합니다.",
    "과업 종료 버튼 뒤의 종료 확인 대화상자 조작은 실제 지표에서 제외합니다."
  ],
  "actualMeasurementScope": "과업 설명은 메인 창에서 확인하고, 새 탭의 실제 검색 결과 목록 조작만 기록합니다."
};
