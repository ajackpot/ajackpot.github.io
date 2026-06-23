export const benchmarkResultsSearch = {
  "generatedAt": "2026-06-23T00:16:17.059Z",
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
              "navMoves": 51,
              "activations": 4,
              "decisions": 14,
              "waits": 1,
              "speechUnits": 26,
              "scanSteps": 61,
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
                "navMoves": 26,
                "activations": 1,
                "decisions": 7,
                "waits": 0,
                "speechUnits": 14,
                "scanSteps": 31,
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
                  "milliseconds": 30116,
                  "seconds": 30.1
                },
                "expected": {
                  "milliseconds": 44805,
                  "seconds": 44.8
                },
                "upper": {
                  "milliseconds": 63998,
                  "seconds": 64
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 12110,
                    "seconds": 12.1
                  },
                  "repeated": {
                    "milliseconds": 14860,
                    "seconds": 14.9
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
                    "milliseconds": 21770,
                    "seconds": 21.8
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
                    "milliseconds": 30500,
                    "seconds": 30.5
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
                  "milliseconds": 52856,
                  "seconds": 52.9
                },
                "expected": {
                  "milliseconds": 77041,
                  "seconds": 77
                },
                "upper": {
                  "milliseconds": 110610,
                  "seconds": 110.6
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 20440,
                    "seconds": 20.4
                  },
                  "repeated": {
                    "milliseconds": 25600,
                    "seconds": 25.6
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
                    "milliseconds": 36220,
                    "seconds": 36.2
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
                    "milliseconds": 50530,
                    "seconds": 50.5
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
                  "milliseconds": 71265,
                  "seconds": 71.3
                },
                "expected": {
                  "milliseconds": 108497,
                  "seconds": 108.5
                },
                "upper": {
                  "milliseconds": 168470,
                  "seconds": 168.5
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 28270,
                    "seconds": 28.3
                  },
                  "repeated": {
                    "milliseconds": 34350,
                    "seconds": 34.4
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
                    "milliseconds": 50680,
                    "seconds": 50.7
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
                    "milliseconds": 75850,
                    "seconds": 75.8
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
              "navMoves": 62,
              "activations": 6,
              "decisions": 19,
              "waits": 1,
              "speechUnits": 33,
              "scanSteps": 75,
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
                "navMoves": 38,
                "activations": 3,
                "decisions": 12,
                "waits": 0,
                "speechUnits": 22,
                "scanSteps": 46,
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
                  "milliseconds": 37606,
                  "seconds": 37.6
                },
                "expected": {
                  "milliseconds": 55845,
                  "seconds": 55.8
                },
                "upper": {
                  "milliseconds": 79548,
                  "seconds": 79.5
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 11660,
                    "seconds": 11.7
                  },
                  "repeated": {
                    "milliseconds": 22800,
                    "seconds": 22.8
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
                    "milliseconds": 33460,
                    "seconds": 33.5
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
                    "milliseconds": 46950,
                    "seconds": 47
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
                  "milliseconds": 65696,
                  "seconds": 65.7
                },
                "expected": {
                  "milliseconds": 95261,
                  "seconds": 95.3
                },
                "upper": {
                  "milliseconds": 136130,
                  "seconds": 136.1
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 19580,
                    "seconds": 19.6
                  },
                  "repeated": {
                    "milliseconds": 39300,
                    "seconds": 39.3
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
                    "milliseconds": 55660,
                    "seconds": 55.7
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
                    "milliseconds": 77740,
                    "seconds": 77.7
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
                  "milliseconds": 88965,
                  "seconds": 89
                },
                "expected": {
                  "milliseconds": 134557,
                  "seconds": 134.6
                },
                "upper": {
                  "milliseconds": 207220,
                  "seconds": 207.2
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 27320,
                    "seconds": 27.3
                  },
                  "repeated": {
                    "milliseconds": 53000,
                    "seconds": 53
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
                    "milliseconds": 78140,
                    "seconds": 78.1
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
                    "milliseconds": 116700,
                    "seconds": 116.7
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
              "navMoves": 13,
              "activations": 5,
              "decisions": 9,
              "waits": 1,
              "speechUnits": 11,
              "scanSteps": 18,
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
                "activations": 0,
                "decisions": 2,
                "waits": 0,
                "speechUnits": 2,
                "scanSteps": 4,
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
                  "milliseconds": 11068,
                  "seconds": 11.1
                },
                "expected": {
                  "milliseconds": 16930,
                  "seconds": 16.9
                },
                "upper": {
                  "milliseconds": 24890,
                  "seconds": 24.9
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 6480,
                    "seconds": 6.5
                  },
                  "repeated": {
                    "milliseconds": 2190,
                    "seconds": 2.2
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
                    "milliseconds": 3250,
                    "seconds": 3.3
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
                    "milliseconds": 4600,
                    "seconds": 4.6
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
                  "milliseconds": 19308,
                  "seconds": 19.3
                },
                "expected": {
                  "milliseconds": 28840,
                  "seconds": 28.8
                },
                "upper": {
                  "milliseconds": 42384,
                  "seconds": 42.4
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 11120,
                    "seconds": 11.1
                  },
                  "repeated": {
                    "milliseconds": 3820,
                    "seconds": 3.8
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
                    "milliseconds": 5420,
                    "seconds": 5.4
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
                    "milliseconds": 7630,
                    "seconds": 7.6
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
                  "milliseconds": 27755,
                  "seconds": 27.8
                },
                "expected": {
                  "milliseconds": 43594,
                  "seconds": 43.6
                },
                "upper": {
                  "milliseconds": 69530,
                  "seconds": 69.5
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 15670,
                    "seconds": 15.7
                  },
                  "repeated": {
                    "milliseconds": 5000,
                    "seconds": 5
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
                    "milliseconds": 7400,
                    "seconds": 7.4
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
                    "milliseconds": 11100,
                    "seconds": 11.1
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
              "navMoves": 17,
              "activations": 7,
              "decisions": 12,
              "waits": 1,
              "speechUnits": 14,
              "scanSteps": 23,
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
                "navMoves": 9,
                "activations": 3,
                "decisions": 7,
                "waits": 0,
                "speechUnits": 7,
                "scanSteps": 12,
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
                  "milliseconds": 14459,
                  "seconds": 14.5
                },
                "expected": {
                  "milliseconds": 21715,
                  "seconds": 21.7
                },
                "upper": {
                  "milliseconds": 31205,
                  "seconds": 31.2
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 5610,
                    "seconds": 5.6
                  },
                  "repeated": {
                    "milliseconds": 7650,
                    "seconds": 7.7
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
                    "milliseconds": 11360,
                    "seconds": 11.4
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
                    "milliseconds": 16100,
                    "seconds": 16.1
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
                  "milliseconds": 24844,
                  "seconds": 24.8
                },
                "expected": {
                  "milliseconds": 36070,
                  "seconds": 36.1
                },
                "upper": {
                  "milliseconds": 51632,
                  "seconds": 51.6
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 9560,
                    "seconds": 9.6
                  },
                  "repeated": {
                    "milliseconds": 13100,
                    "seconds": 13.1
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
                    "milliseconds": 18640,
                    "seconds": 18.6
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
                    "milliseconds": 26240,
                    "seconds": 26.2
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
                  "milliseconds": 34745,
                  "seconds": 34.7
                },
                "expected": {
                  "milliseconds": 52212,
                  "seconds": 52.2
                },
                "upper": {
                  "milliseconds": 79145,
                  "seconds": 79.1
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 14120,
                    "seconds": 14.1
                  },
                  "repeated": {
                    "milliseconds": 17700,
                    "seconds": 17.7
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
                    "milliseconds": 26040,
                    "seconds": 26
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
                    "milliseconds": 38550,
                    "seconds": 38.5
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
        "expectedReductionSeconds": 27.9,
        "expectedReductionPercent": 62.3
      },
      "screenReader": {
        "expectedReductionSeconds": 48.2,
        "expectedReductionPercent": 62.6
      },
      "switch": {
        "expectedReductionSeconds": 64.9,
        "expectedReductionPercent": 59.8
      }
    },
    "task2_title_faq_save_options": {
      "keyboard": {
        "expectedReductionSeconds": 34.1,
        "expectedReductionPercent": 61.1
      },
      "screenReader": {
        "expectedReductionSeconds": 59.2,
        "expectedReductionPercent": 62.1
      },
      "switch": {
        "expectedReductionSeconds": 82.4,
        "expectedReductionPercent": 61.2
      }
    }
  },
  "overall": {
    "keyboard": {
      "label": "키보드 사용자",
      "variantAExpectedSeconds": 100.6,
      "variantBExpectedSeconds": 38.6,
      "expectedReductionSeconds": 62,
      "expectedReductionPercent": 61.6
    },
    "screenReader": {
      "label": "화면낭독 사용자",
      "variantAExpectedSeconds": 172.3,
      "variantBExpectedSeconds": 64.9,
      "expectedReductionSeconds": 107.4,
      "expectedReductionPercent": 62.3
    },
    "switch": {
      "label": "스위치 사용자",
      "variantAExpectedSeconds": 243.1,
      "variantBExpectedSeconds": 95.8,
      "expectedReductionSeconds": 147.3,
      "expectedReductionPercent": 60.6
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
