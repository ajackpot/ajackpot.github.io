export const benchmarkResultsComments = {
  "generatedAt": "2026-08-12T06:48:49.985Z",
  "variants": {
    "variantA": {
      "label": "조작 부담 문제가 있는 페이지",
      "description": "본문 바로가기 링크로 글로벌 메뉴를 건너뛴 뒤에도 변형된 조건 선택과 댓글별 반복 작업 버튼을 지나야 하는 구조.",
      "tasks": {
        "task1_newest_review_open_replies": {
          "title": "최신 후기에서 민지 댓글 답글 확인하기",
          "assumptions": [
            "페이지 맨 앞의 본문 바로가기 링크를 사용해 글로벌 메뉴 탐색은 건너뛴다.",
            "정렬 기준과 댓글 범위가 접힌 것처럼 보이지만 선택지가 각각 초점을 받아 조건 선택 비용이 늘어난다.",
            "댓글마다 작성자, 작성 시각, 공유, 도움이 돼요, 답글 보기, 댓글 정보 보기 등 여러 멈춤 지점이 있다.",
            "답글 목록에서 확인한 답은 과업 종료 영역에서 함께 제출하므로 서비스 화면 반복 비용에는 넣지 않는다."
          ],
          "structural": {
            "totals": {
              "navMoves": 56,
              "activations": 4,
              "decisions": 16,
              "waits": 1,
              "speechUnits": 31,
              "scanSteps": 67,
              "contextResets": 0
            },
            "byBucket": {
              "entry": {
                "navMoves": 23,
                "activations": 3,
                "decisions": 7,
                "waits": 1,
                "speechUnits": 13,
                "scanSteps": 28,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 33,
                "activations": 1,
                "decisions": 9,
                "waits": 0,
                "speechUnits": 18,
                "scanSteps": 39,
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
                  "milliseconds": 32920,
                  "seconds": 32.9
                },
                "expected": {
                  "milliseconds": 48300,
                  "seconds": 48.3
                },
                "upper": {
                  "milliseconds": 67720,
                  "seconds": 67.7
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 14070,
                    "seconds": 14.1
                  },
                  "repeated": {
                    "milliseconds": 18850,
                    "seconds": 18.9
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 20680,
                    "seconds": 20.7
                  },
                  "repeated": {
                    "milliseconds": 27620,
                    "seconds": 27.6
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 29020,
                    "seconds": 29
                  },
                  "repeated": {
                    "milliseconds": 38700,
                    "seconds": 38.7
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
                  "milliseconds": 56520,
                  "seconds": 56.5
                },
                "expected": {
                  "milliseconds": 80060,
                  "seconds": 80.1
                },
                "upper": {
                  "milliseconds": 111740,
                  "seconds": 111.7
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 23980,
                    "seconds": 24
                  },
                  "repeated": {
                    "milliseconds": 32540,
                    "seconds": 32.5
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 34020,
                    "seconds": 34
                  },
                  "repeated": {
                    "milliseconds": 46040,
                    "seconds": 46
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 47500,
                    "seconds": 47.5
                  },
                  "repeated": {
                    "milliseconds": 64240,
                    "seconds": 64.2
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
                  "milliseconds": 76170,
                  "seconds": 76.2
                },
                "expected": {
                  "milliseconds": 112340,
                  "seconds": 112.3
                },
                "upper": {
                  "milliseconds": 167820,
                  "seconds": 167.8
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 33020,
                    "seconds": 33
                  },
                  "repeated": {
                    "milliseconds": 43150,
                    "seconds": 43.1
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 48660,
                    "seconds": 48.7
                  },
                  "repeated": {
                    "milliseconds": 63680,
                    "seconds": 63.7
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 72470,
                    "seconds": 72.5
                  },
                  "repeated": {
                    "milliseconds": 95350,
                    "seconds": 95.3
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
        "task2_popular_admin_detail_helpful": {
          "title": "3월 25일 운영자 안내 댓글 정보 보기 후 도움이 돼요",
          "assumptions": [
            "페이지 맨 앞의 본문 바로가기 링크를 사용해 글로벌 메뉴 탐색은 건너뛴다.",
            "정렬 기준을 다시 맞춘 뒤 댓글 목록 맨 앞에서부터 원하는 댓글의 작업 버튼을 찾아야 한다.",
            "댓글 정보 대화상자를 닫으면 원래 댓글의 버튼으로 돌아가지 않고 댓글 목록 제목 근처부터 다시 찾아야 한다.",
            "도움이 돼요 버튼과 댓글 정보 버튼이 떨어져 있어 같은 댓글 안에서도 이동 횟수가 커진다."
          ],
          "structural": {
            "totals": {
              "navMoves": 56,
              "activations": 5,
              "decisions": 15,
              "waits": 1,
              "speechUnits": 31,
              "scanSteps": 65,
              "contextResets": 2
            },
            "byBucket": {
              "entry": {
                "navMoves": 8,
                "activations": 2,
                "decisions": 3,
                "waits": 1,
                "speechUnits": 6,
                "scanSteps": 10,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 21,
                "activations": 1,
                "decisions": 5,
                "waits": 0,
                "speechUnits": 11,
                "scanSteps": 24,
                "contextResets": 0
              },
              "recovery": {
                "navMoves": 27,
                "activations": 2,
                "decisions": 7,
                "waits": 0,
                "speechUnits": 14,
                "scanSteps": 31,
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
                  "milliseconds": 34273,
                  "seconds": 34.3
                },
                "expected": {
                  "milliseconds": 53656,
                  "seconds": 53.7
                },
                "upper": {
                  "milliseconds": 81553,
                  "seconds": 81.6
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 5420,
                    "seconds": 5.4
                  },
                  "repeated": {
                    "milliseconds": 11770,
                    "seconds": 11.8
                  },
                  "recovery": {
                    "milliseconds": 17083,
                    "seconds": 17.1
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 8010,
                    "seconds": 8
                  },
                  "repeated": {
                    "milliseconds": 17220,
                    "seconds": 17.2
                  },
                  "recovery": {
                    "milliseconds": 28426,
                    "seconds": 28.4
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 11270,
                    "seconds": 11.3
                  },
                  "repeated": {
                    "milliseconds": 24100,
                    "seconds": 24.1
                  },
                  "recovery": {
                    "milliseconds": 46183,
                    "seconds": 46.2
                  }
                }
              }
            },
            "screenReader": {
              "label": "화면낭독 사용자",
              "description": "키보드 비용에 발화 청취와 문맥 재구축 비용을 더한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 63552,
                  "seconds": 63.6
                },
                "expected": {
                  "milliseconds": 100411,
                  "seconds": 100.4
                },
                "upper": {
                  "milliseconds": 154630,
                  "seconds": 154.6
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 9300,
                    "seconds": 9.3
                  },
                  "repeated": {
                    "milliseconds": 20220,
                    "seconds": 20.2
                  },
                  "recovery": {
                    "milliseconds": 34032,
                    "seconds": 34
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 13260,
                    "seconds": 13.3
                  },
                  "repeated": {
                    "milliseconds": 28600,
                    "seconds": 28.6
                  },
                  "recovery": {
                    "milliseconds": 58551,
                    "seconds": 58.6
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 18550,
                    "seconds": 18.6
                  },
                  "repeated": {
                    "milliseconds": 39860,
                    "seconds": 39.9
                  },
                  "recovery": {
                    "milliseconds": 96220,
                    "seconds": 96.2
                  }
                }
              }
            },
            "switch": {
              "label": "스위치 사용자",
              "description": "자동 스캔 기반 순차 입력을 가정한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 84885,
                  "seconds": 84.9
                },
                "expected": {
                  "milliseconds": 143199,
                  "seconds": 143.2
                },
                "upper": {
                  "milliseconds": 248435,
                  "seconds": 248.4
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 12820,
                    "seconds": 12.8
                  },
                  "repeated": {
                    "milliseconds": 26500,
                    "seconds": 26.5
                  },
                  "recovery": {
                    "milliseconds": 45565,
                    "seconds": 45.6
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 18880,
                    "seconds": 18.9
                  },
                  "repeated": {
                    "milliseconds": 39080,
                    "seconds": 39.1
                  },
                  "recovery": {
                    "milliseconds": 85239,
                    "seconds": 85.2
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 27970,
                    "seconds": 28
                  },
                  "repeated": {
                    "milliseconds": 58450,
                    "seconds": 58.5
                  },
                  "recovery": {
                    "milliseconds": 162015,
                    "seconds": 162
                  }
                }
              }
            }
          }
        }
      }
    },
    "variantB": {
      "label": "조작 부담이 개선된 페이지",
      "description": "본문 바로가기 링크로 글로벌 메뉴를 건너뛴 뒤 하나의 선택 항목 구조와 한곳에 모은 댓글 작업으로 반복 버튼을 줄인 구조.",
      "tasks": {
        "task1_newest_review_open_replies": {
          "title": "최신 후기에서 민지 댓글 답글 확인하기",
          "assumptions": [
            "페이지 맨 앞의 본문 바로가기 링크를 사용해 글로벌 메뉴 탐색은 건너뛴다.",
            "정렬과 범위 선택은 일반 폼 요소로 제공되어 조건 선택 비용이 짧다.",
            "선택한 댓글 작업이 한곳에 모여 있어 답글 보기까지의 이동이 짧다."
          ],
          "structural": {
            "totals": {
              "navMoves": 13,
              "activations": 4,
              "decisions": 8,
              "waits": 1,
              "speechUnits": 10,
              "scanSteps": 17,
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
                "navMoves": 6,
                "activations": 1,
                "decisions": 4,
                "waits": 0,
                "speechUnits": 4,
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
                  "milliseconds": 10210,
                  "seconds": 10.2
                },
                "expected": {
                  "milliseconds": 15150,
                  "seconds": 15.2
                },
                "upper": {
                  "milliseconds": 21420,
                  "seconds": 21.4
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 5610,
                    "seconds": 5.6
                  },
                  "repeated": {
                    "milliseconds": 4600,
                    "seconds": 4.6
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 8330,
                    "seconds": 8.3
                  },
                  "repeated": {
                    "milliseconds": 6820,
                    "seconds": 6.8
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 11770,
                    "seconds": 11.8
                  },
                  "repeated": {
                    "milliseconds": 9650,
                    "seconds": 9.7
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
                  "milliseconds": 17460,
                  "seconds": 17.5
                },
                "expected": {
                  "milliseconds": 24880,
                  "seconds": 24.9
                },
                "upper": {
                  "milliseconds": 34950,
                  "seconds": 35
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 9560,
                    "seconds": 9.6
                  },
                  "repeated": {
                    "milliseconds": 7900,
                    "seconds": 7.9
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 13660,
                    "seconds": 13.7
                  },
                  "repeated": {
                    "milliseconds": 11220,
                    "seconds": 11.2
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 19170,
                    "seconds": 19.2
                  },
                  "repeated": {
                    "milliseconds": 15780,
                    "seconds": 15.8
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
                  "milliseconds": 23870,
                  "seconds": 23.9
                },
                "expected": {
                  "milliseconds": 35140,
                  "seconds": 35.1
                },
                "upper": {
                  "milliseconds": 52020,
                  "seconds": 52
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 14120,
                    "seconds": 14.1
                  },
                  "repeated": {
                    "milliseconds": 9750,
                    "seconds": 9.8
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 20760,
                    "seconds": 20.8
                  },
                  "repeated": {
                    "milliseconds": 14380,
                    "seconds": 14.4
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 30620,
                    "seconds": 30.6
                  },
                  "repeated": {
                    "milliseconds": 21400,
                    "seconds": 21.4
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
        "task2_popular_admin_detail_helpful": {
          "title": "3월 25일 운영자 안내 댓글 정보 보기 후 도움이 돼요",
          "assumptions": [
            "페이지 맨 앞의 본문 바로가기 링크를 사용해 글로벌 메뉴 탐색은 건너뛴다.",
            "선택한 댓글 작업이 같은 카드에 있어 댓글 정보 보기와 도움이 돼요가 가까이 있다.",
            "댓글 정보 대화상자를 닫으면 원래 작업 버튼으로 돌아온다.",
            "도움이 돼요는 토스트로 처리되어 별도 확인 대화상자를 추가하지 않는다."
          ],
          "structural": {
            "totals": {
              "navMoves": 11,
              "activations": 5,
              "decisions": 8,
              "waits": 1,
              "speechUnits": 10,
              "scanSteps": 16,
              "contextResets": 0
            },
            "byBucket": {
              "entry": {
                "navMoves": 5,
                "activations": 2,
                "decisions": 3,
                "waits": 1,
                "speechUnits": 5,
                "scanSteps": 7,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 4,
                "activations": 1,
                "decisions": 3,
                "waits": 0,
                "speechUnits": 3,
                "scanSteps": 6,
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
                    "milliseconds": 4070,
                    "seconds": 4.1
                  },
                  "repeated": {
                    "milliseconds": 3280,
                    "seconds": 3.3
                  },
                  "recovery": {
                    "milliseconds": 2398,
                    "seconds": 2.4
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 6060,
                    "seconds": 6.1
                  },
                  "repeated": {
                    "milliseconds": 4870,
                    "seconds": 4.9
                  },
                  "recovery": {
                    "milliseconds": 4050,
                    "seconds": 4
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 8570,
                    "seconds": 8.6
                  },
                  "repeated": {
                    "milliseconds": 6900,
                    "seconds": 6.9
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
                    "milliseconds": 7040,
                    "seconds": 7
                  },
                  "repeated": {
                    "milliseconds": 5640,
                    "seconds": 5.6
                  },
                  "recovery": {
                    "milliseconds": 4368,
                    "seconds": 4.4
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 10080,
                    "seconds": 10.1
                  },
                  "repeated": {
                    "milliseconds": 8020,
                    "seconds": 8
                  },
                  "recovery": {
                    "milliseconds": 7540,
                    "seconds": 7.5
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 14160,
                    "seconds": 14.2
                  },
                  "repeated": {
                    "milliseconds": 11290,
                    "seconds": 11.3
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
                  "milliseconds": 25255,
                  "seconds": 25.3
                },
                "expected": {
                  "milliseconds": 39894,
                  "seconds": 39.9
                },
                "upper": {
                  "milliseconds": 63980,
                  "seconds": 64
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 9970,
                    "seconds": 10
                  },
                  "repeated": {
                    "milliseconds": 8200,
                    "seconds": 8.2
                  },
                  "recovery": {
                    "milliseconds": 7085,
                    "seconds": 7.1
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 14680,
                    "seconds": 14.7
                  },
                  "repeated": {
                    "milliseconds": 12080,
                    "seconds": 12.1
                  },
                  "recovery": {
                    "milliseconds": 13134,
                    "seconds": 13.1
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 21670,
                    "seconds": 21.7
                  },
                  "repeated": {
                    "milliseconds": 17950,
                    "seconds": 17.9
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
    "task1_newest_review_open_replies": {
      "keyboard": {
        "expectedReductionSeconds": 33.1,
        "expectedReductionPercent": 68.5
      },
      "screenReader": {
        "expectedReductionSeconds": 55.2,
        "expectedReductionPercent": 68.9
      },
      "switch": {
        "expectedReductionSeconds": 77.2,
        "expectedReductionPercent": 68.7
      }
    },
    "task2_popular_admin_detail_helpful": {
      "keyboard": {
        "expectedReductionSeconds": 38.7,
        "expectedReductionPercent": 72.1
      },
      "screenReader": {
        "expectedReductionSeconds": 74.8,
        "expectedReductionPercent": 74.5
      },
      "switch": {
        "expectedReductionSeconds": 103.3,
        "expectedReductionPercent": 72.1
      }
    }
  },
  "overall": {
    "keyboard": {
      "label": "키보드 사용자",
      "variantAExpectedSeconds": 102,
      "variantBExpectedSeconds": 30.2,
      "expectedReductionSeconds": 71.8,
      "expectedReductionPercent": 70.4
    },
    "screenReader": {
      "label": "화면낭독 사용자",
      "variantAExpectedSeconds": 180.5,
      "variantBExpectedSeconds": 50.5,
      "expectedReductionSeconds": 130,
      "expectedReductionPercent": 72
    },
    "switch": {
      "label": "스위치 사용자",
      "variantAExpectedSeconds": 255.5,
      "variantBExpectedSeconds": 75,
      "expectedReductionSeconds": 180.5,
      "expectedReductionPercent": 70.6
    }
  },
  "measurementRules": [
    "수행 기록은 과업 수행 페이지에서 처음 키를 누르거나 화면을 클릭할 때 시작합니다.",
    "과업 수행 페이지가 보이지 않는 시간은 수행 시간에 포함하지 않습니다.",
    "페이지 맨 아래의 이동 및 종료 버튼 조작은 결과 지표에 포함하지 않습니다.",
    "‘과업 종료’를 누른 뒤 확인 창에서 한 조작은 결과 지표에 포함하지 않습니다."
  ],
  "actualMeasurementScope": "과업 설명은 메인 창에서 확인하고, 새 탭의 실제 댓글 목록 조작만 기록합니다."
};
