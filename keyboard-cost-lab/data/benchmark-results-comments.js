export const benchmarkResultsComments = {
  "generatedAt": "2026-03-31T11:17:21.538Z",
  "variants": {
    "variantA": {
      "label": "비교안 A · 조작 부담이 큰 구조",
      "description": "상단 링크와 정렬·범위 선택을 지난 뒤 댓글 목록에 도달하고, 댓글마다 여러 개의 링크와 버튼을 지나야 하며, 댓글 정보 대화상자를 닫으면 댓글 목록 제목 근처부터 다시 찾게 되는 구조.",
      "tasks": {
        "task1_newest_review_open_replies": {
          "title": "최신 후기에서 민지 댓글 답글 열기",
          "assumptions": [
            "상단 보조 링크와 범위 선택 도움 링크를 지나 댓글 목록에 도달해야 한다.",
            "댓글마다 작성자, 작성 시각, 공유, 도움이 돼요, 답글 보기, 댓글 정보 보기 등 여러 멈춤 지점이 있다.",
            "원하는 댓글 앞의 다른 댓글 행동 버튼들을 지나며 순차 탐색 부담이 누적된다."
          ],
          "structural": {
            "totals": {
              "navMoves": 44,
              "activations": 3,
              "decisions": 13,
              "waits": 1,
              "speechUnits": 23,
              "scanSteps": 53,
              "contextResets": 0
            },
            "byBucket": {
              "entry": {
                "navMoves": 29,
                "activations": 2,
                "decisions": 7,
                "waits": 1,
                "speechUnits": 13,
                "scanSteps": 34,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 15,
                "activations": 1,
                "decisions": 6,
                "waits": 0,
                "speechUnits": 10,
                "scanSteps": 19,
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
                  "milliseconds": 26040,
                  "seconds": 26
                },
                "expected": {
                  "milliseconds": 38230,
                  "seconds": 38.2
                },
                "upper": {
                  "milliseconds": 53620,
                  "seconds": 53.6
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 16550,
                    "seconds": 16.6
                  },
                  "repeated": {
                    "milliseconds": 9490,
                    "seconds": 9.5
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 24260,
                    "seconds": 24.3
                  },
                  "repeated": {
                    "milliseconds": 13970,
                    "seconds": 14
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 33970,
                    "seconds": 34
                  },
                  "repeated": {
                    "milliseconds": 19650,
                    "seconds": 19.6
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
                  "milliseconds": 44480,
                  "seconds": 44.5
                },
                "expected": {
                  "milliseconds": 63000,
                  "seconds": 63
                },
                "upper": {
                  "milliseconds": 87950,
                  "seconds": 88
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 27920,
                    "seconds": 27.9
                  },
                  "repeated": {
                    "milliseconds": 16560,
                    "seconds": 16.6
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 39520,
                    "seconds": 39.5
                  },
                  "repeated": {
                    "milliseconds": 23480,
                    "seconds": 23.5
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 55080,
                    "seconds": 55.1
                  },
                  "repeated": {
                    "milliseconds": 32870,
                    "seconds": 32.9
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
                  "milliseconds": 60370,
                  "seconds": 60.4
                },
                "expected": {
                  "milliseconds": 89060,
                  "seconds": 89.1
                },
                "upper": {
                  "milliseconds": 133070,
                  "seconds": 133.1
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 38020,
                    "seconds": 38
                  },
                  "repeated": {
                    "milliseconds": 22350,
                    "seconds": 22.4
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 56080,
                    "seconds": 56.1
                  },
                  "repeated": {
                    "milliseconds": 32980,
                    "seconds": 33
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 83770,
                    "seconds": 83.8
                  },
                  "repeated": {
                    "milliseconds": 49300,
                    "seconds": 49.3
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
          "title": "운영자 안내 댓글 정보 보기 후 도움이 돼요",
          "assumptions": [
            "정렬 기준을 다시 맞춘 뒤 댓글 목록 맨 앞에서부터 원하는 댓글의 작업 버튼을 찾아야 한다.",
            "댓글 정보 대화상자를 닫으면 원래 댓글의 버튼으로 돌아가지 않고 댓글 목록 제목 근처부터 다시 찾아야 한다.",
            "도움이 돼요 버튼과 댓글 정보 버튼이 떨어져 있어 같은 댓글 안에서도 이동 횟수가 커진다."
          ],
          "structural": {
            "totals": {
              "navMoves": 38,
              "activations": 4,
              "decisions": 11,
              "waits": 1,
              "speechUnits": 19,
              "scanSteps": 45,
              "contextResets": 2
            },
            "byBucket": {
              "entry": {
                "navMoves": 16,
                "activations": 1,
                "decisions": 3,
                "waits": 1,
                "speechUnits": 6,
                "scanSteps": 18,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 8,
                "activations": 1,
                "decisions": 3,
                "waits": 0,
                "speechUnits": 5,
                "scanSteps": 10,
                "contextResets": 0
              },
              "recovery": {
                "navMoves": 14,
                "activations": 2,
                "decisions": 5,
                "waits": 0,
                "speechUnits": 8,
                "scanSteps": 17,
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
                  "milliseconds": 23604,
                  "seconds": 23.6
                },
                "expected": {
                  "milliseconds": 36598,
                  "seconds": 36.6
                },
                "upper": {
                  "milliseconds": 54983,
                  "seconds": 55
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 8800,
                    "seconds": 8.8
                  },
                  "repeated": {
                    "milliseconds": 5080,
                    "seconds": 5.1
                  },
                  "recovery": {
                    "milliseconds": 9724,
                    "seconds": 9.7
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 12890,
                    "seconds": 12.9
                  },
                  "repeated": {
                    "milliseconds": 7470,
                    "seconds": 7.5
                  },
                  "recovery": {
                    "milliseconds": 16238,
                    "seconds": 16.2
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 18020,
                    "seconds": 18
                  },
                  "repeated": {
                    "milliseconds": 10500,
                    "seconds": 10.5
                  },
                  "recovery": {
                    "milliseconds": 26463,
                    "seconds": 26.5
                  }
                }
              }
            },
            "screenReader": {
              "label": "화면낭독 사용자",
              "description": "키보드 비용에 발화 청취와 문맥 재구축 비용을 더한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 43680,
                  "seconds": 43.7
                },
                "expected": {
                  "milliseconds": 68230,
                  "seconds": 68.2
                },
                "upper": {
                  "milliseconds": 104187,
                  "seconds": 104.2
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 14640,
                    "seconds": 14.6
                  },
                  "repeated": {
                    "milliseconds": 8760,
                    "seconds": 8.8
                  },
                  "recovery": {
                    "milliseconds": 20280,
                    "seconds": 20.3
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 20720,
                    "seconds": 20.7
                  },
                  "repeated": {
                    "milliseconds": 12420,
                    "seconds": 12.4
                  },
                  "recovery": {
                    "milliseconds": 35090,
                    "seconds": 35.1
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 28830,
                    "seconds": 28.8
                  },
                  "repeated": {
                    "milliseconds": 17370,
                    "seconds": 17.4
                  },
                  "recovery": {
                    "milliseconds": 57987,
                    "seconds": 58
                  }
                }
              }
            },
            "switch": {
              "label": "스위치 사용자",
              "description": "자동 스캔 기반 순차 입력을 가정한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 58435,
                  "seconds": 58.4
                },
                "expected": {
                  "milliseconds": 96709,
                  "seconds": 96.7
                },
                "upper": {
                  "milliseconds": 164425,
                  "seconds": 164.4
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 19720,
                    "seconds": 19.7
                  },
                  "repeated": {
                    "milliseconds": 12000,
                    "seconds": 12
                  },
                  "recovery": {
                    "milliseconds": 26715,
                    "seconds": 26.7
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 29100,
                    "seconds": 29.1
                  },
                  "repeated": {
                    "milliseconds": 17680,
                    "seconds": 17.7
                  },
                  "recovery": {
                    "milliseconds": 49929,
                    "seconds": 49.9
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 43470,
                    "seconds": 43.5
                  },
                  "repeated": {
                    "milliseconds": 26350,
                    "seconds": 26.4
                  },
                  "recovery": {
                    "milliseconds": 94605,
                    "seconds": 94.6
                  }
                }
              }
            }
          }
        },
        "task3_question_open_juno_replies": {
          "title": "질문 댓글에서 준호 댓글 답글 열기",
          "assumptions": [
            "댓글 범위를 질문으로 바꾼 뒤에도 적용 버튼과 보조 링크를 지나 다시 댓글 목록을 만나야 한다.",
            "답글이 열려 있던 다른 댓글이 있어도 원하는 질문 댓글의 버튼을 다시 찾아야 한다.",
            "순차 탐색 구조에서는 댓글 수가 줄어도 각 댓글 안의 버튼 수 때문에 비용이 쉽게 남는다."
          ],
          "structural": {
            "totals": {
              "navMoves": 30,
              "activations": 2,
              "decisions": 9,
              "waits": 1,
              "speechUnits": 16,
              "scanSteps": 37,
              "contextResets": 0
            },
            "byBucket": {
              "entry": {
                "navMoves": 18,
                "activations": 1,
                "decisions": 4,
                "waits": 1,
                "speechUnits": 8,
                "scanSteps": 22,
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
                  "milliseconds": 17840,
                  "seconds": 17.8
                },
                "expected": {
                  "milliseconds": 26210,
                  "seconds": 26.2
                },
                "upper": {
                  "milliseconds": 36770,
                  "seconds": 36.8
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 10120,
                    "seconds": 10.1
                  },
                  "repeated": {
                    "milliseconds": 7720,
                    "seconds": 7.7
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 14840,
                    "seconds": 14.8
                  },
                  "repeated": {
                    "milliseconds": 11370,
                    "seconds": 11.4
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 20770,
                    "seconds": 20.8
                  },
                  "repeated": {
                    "milliseconds": 16000,
                    "seconds": 16
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
                  "milliseconds": 30500,
                  "seconds": 30.5
                },
                "expected": {
                  "milliseconds": 43220,
                  "seconds": 43.2
                },
                "upper": {
                  "milliseconds": 60350,
                  "seconds": 60.4
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 17060,
                    "seconds": 17.1
                  },
                  "repeated": {
                    "milliseconds": 13440,
                    "seconds": 13.4
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 24160,
                    "seconds": 24.2
                  },
                  "repeated": {
                    "milliseconds": 19060,
                    "seconds": 19.1
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 33660,
                    "seconds": 33.7
                  },
                  "repeated": {
                    "milliseconds": 26690,
                    "seconds": 26.7
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
                  "milliseconds": 42070,
                  "seconds": 42.1
                },
                "expected": {
                  "milliseconds": 62080,
                  "seconds": 62.1
                },
                "upper": {
                  "milliseconds": 92770,
                  "seconds": 92.8
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 24120,
                    "seconds": 24.1
                  },
                  "repeated": {
                    "milliseconds": 17950,
                    "seconds": 17.9
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 35600,
                    "seconds": 35.6
                  },
                  "repeated": {
                    "milliseconds": 26480,
                    "seconds": 26.5
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 53220,
                    "seconds": 53.2
                  },
                  "repeated": {
                    "milliseconds": 39550,
                    "seconds": 39.5
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
      "description": "댓글 목록으로 바로 이동하고, 댓글 하나를 하나의 선택 항목으로 이동하며, 댓글 작업을 한곳에 모으고, 댓글 정보 대화상자를 닫으면 바로 원래 작업 버튼으로 돌아오는 구조.",
      "tasks": {
        "task1_newest_review_open_replies": {
          "title": "최신 후기에서 민지 댓글 답글 열기",
          "assumptions": [
            "댓글 목록으로 바로 이동하는 링크와 버튼으로 첫 진입 부담을 줄인다.",
            "댓글은 하나의 선택 항목으로 제공되어 한 댓글 안의 여러 작업 버튼을 반복해 지나지 않는다.",
            "선택한 댓글 작업이 한곳에 모여 있어 답글 보기까지의 이동이 짧다."
          ],
          "structural": {
            "totals": {
              "navMoves": 12,
              "activations": 4,
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
                  "milliseconds": 9760,
                  "seconds": 9.8
                },
                "expected": {
                  "milliseconds": 14500,
                  "seconds": 14.5
                },
                "upper": {
                  "milliseconds": 20520,
                  "seconds": 20.5
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 6480,
                    "seconds": 6.5
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
                    "milliseconds": 9630,
                    "seconds": 9.6
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
                    "milliseconds": 13620,
                    "seconds": 13.6
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
                  "milliseconds": 16760,
                  "seconds": 16.8
                },
                "expected": {
                  "milliseconds": 23900,
                  "seconds": 23.9
                },
                "upper": {
                  "milliseconds": 33600,
                  "seconds": 33.6
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 11120,
                    "seconds": 11.1
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
                    "milliseconds": 15880,
                    "seconds": 15.9
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
                    "milliseconds": 22310,
                    "seconds": 22.3
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
                  "milliseconds": 22920,
                  "seconds": 22.9
                },
                "expected": {
                  "milliseconds": 33740,
                  "seconds": 33.7
                },
                "upper": {
                  "milliseconds": 49920,
                  "seconds": 49.9
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 15670,
                    "seconds": 15.7
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
                    "milliseconds": 23060,
                    "seconds": 23.1
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
                    "milliseconds": 34070,
                    "seconds": 34.1
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
        "task2_popular_admin_detail_helpful": {
          "title": "운영자 안내 댓글 정보 보기 후 도움이 돼요",
          "assumptions": [
            "도움이 많은 순에서는 운영자 댓글이 바로 선택 영역에서 보인다.",
            "댓글 정보 대화상자를 닫으면 같은 작업 버튼으로 초점이 돌아와 연속 동작이 가능하다.",
            "도움이 돼요, 답글 보기, 댓글 정보 보기가 한곳에 모여 있어 댓글마다 반복되는 탭 이동을 줄인다."
          ],
          "structural": {
            "totals": {
              "navMoves": 8,
              "activations": 4,
              "decisions": 5,
              "waits": 1,
              "speechUnits": 6,
              "scanSteps": 9,
              "contextResets": 0
            },
            "byBucket": {
              "entry": {
                "navMoves": 3,
                "activations": 1,
                "decisions": 2,
                "waits": 1,
                "speechUnits": 2,
                "scanSteps": 4,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 2,
                "activations": 1,
                "decisions": 1,
                "waits": 0,
                "speechUnits": 2,
                "scanSteps": 2,
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
                  "milliseconds": 6963,
                  "seconds": 7
                },
                "expected": {
                  "milliseconds": 10923,
                  "seconds": 10.9
                },
                "upper": {
                  "milliseconds": 16545,
                  "seconds": 16.5
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 2530,
                    "seconds": 2.5
                  },
                  "repeated": {
                    "milliseconds": 1540,
                    "seconds": 1.5
                  },
                  "recovery": {
                    "milliseconds": 2893,
                    "seconds": 2.9
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 3790,
                    "seconds": 3.8
                  },
                  "repeated": {
                    "milliseconds": 2270,
                    "seconds": 2.3
                  },
                  "recovery": {
                    "milliseconds": 4863,
                    "seconds": 4.9
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 5370,
                    "seconds": 5.4
                  },
                  "repeated": {
                    "milliseconds": 3200,
                    "seconds": 3.2
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
                  "milliseconds": 12088,
                  "seconds": 12.1
                },
                "expected": {
                  "milliseconds": 18801,
                  "seconds": 18.8
                },
                "upper": {
                  "milliseconds": 28559,
                  "seconds": 28.6
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 4200,
                    "seconds": 4.2
                  },
                  "repeated": {
                    "milliseconds": 2680,
                    "seconds": 2.7
                  },
                  "recovery": {
                    "milliseconds": 5208,
                    "seconds": 5.2
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 6020,
                    "seconds": 6
                  },
                  "repeated": {
                    "milliseconds": 3820,
                    "seconds": 3.8
                  },
                  "recovery": {
                    "milliseconds": 8961,
                    "seconds": 9
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 8470,
                    "seconds": 8.5
                  },
                  "repeated": {
                    "milliseconds": 5350,
                    "seconds": 5.3
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
                  "milliseconds": 16105,
                  "seconds": 16.1
                },
                "expected": {
                  "milliseconds": 26414,
                  "seconds": 26.4
                },
                "upper": {
                  "milliseconds": 43930,
                  "seconds": 43.9
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 5820,
                    "seconds": 5.8
                  },
                  "repeated": {
                    "milliseconds": 3200,
                    "seconds": 3.2
                  },
                  "recovery": {
                    "milliseconds": 7085,
                    "seconds": 7.1
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 8600,
                    "seconds": 8.6
                  },
                  "repeated": {
                    "milliseconds": 4680,
                    "seconds": 4.7
                  },
                  "recovery": {
                    "milliseconds": 13134,
                    "seconds": 13.1
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 12720,
                    "seconds": 12.7
                  },
                  "repeated": {
                    "milliseconds": 6850,
                    "seconds": 6.8
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
        "task3_question_open_juno_replies": {
          "title": "질문 댓글에서 준호 댓글 답글 열기",
          "assumptions": [
            "댓글 범위를 바꾸면 댓글 목록 제목으로 초점이 이동해 다시 읽을 위치가 분명하다.",
            "질문 댓글 사이 이동은 방향키 중심이라 짧게 끝난다.",
            "답글 보기 작업은 선택한 댓글 작업 영역에서 바로 수행한다."
          ],
          "structural": {
            "totals": {
              "navMoves": 7,
              "activations": 2,
              "decisions": 5,
              "waits": 1,
              "speechUnits": 5,
              "scanSteps": 8,
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
                  "milliseconds": 5810,
                  "seconds": 5.8
                },
                "expected": {
                  "milliseconds": 8660,
                  "seconds": 8.7
                },
                "upper": {
                  "milliseconds": 12270,
                  "seconds": 12.3
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
                    "milliseconds": 0,
                    "seconds": 0
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
                    "milliseconds": 0,
                    "seconds": 0
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
                  "milliseconds": 9840,
                  "seconds": 9.8
                },
                "expected": {
                  "milliseconds": 14040,
                  "seconds": 14
                },
                "upper": {
                  "milliseconds": 19760,
                  "seconds": 19.8
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
                    "milliseconds": 0,
                    "seconds": 0
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
                    "milliseconds": 0,
                    "seconds": 0
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
                  "milliseconds": 12120,
                  "seconds": 12.1
                },
                "expected": {
                  "milliseconds": 17880,
                  "seconds": 17.9
                },
                "upper": {
                  "milliseconds": 26470,
                  "seconds": 26.5
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
                    "milliseconds": 0,
                    "seconds": 0
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
                    "milliseconds": 0,
                    "seconds": 0
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
    "task1_newest_review_open_replies": {
      "keyboard": {
        "expectedReductionSeconds": 23.7,
        "expectedReductionPercent": 62
      },
      "screenReader": {
        "expectedReductionSeconds": 39.1,
        "expectedReductionPercent": 62.1
      },
      "switch": {
        "expectedReductionSeconds": 55.4,
        "expectedReductionPercent": 62.2
      }
    },
    "task2_popular_admin_detail_helpful": {
      "keyboard": {
        "expectedReductionSeconds": 25.7,
        "expectedReductionPercent": 70.2
      },
      "screenReader": {
        "expectedReductionSeconds": 49.4,
        "expectedReductionPercent": 72.4
      },
      "switch": {
        "expectedReductionSeconds": 70.3,
        "expectedReductionPercent": 72.7
      }
    },
    "task3_question_open_juno_replies": {
      "keyboard": {
        "expectedReductionSeconds": 17.5,
        "expectedReductionPercent": 66.8
      },
      "screenReader": {
        "expectedReductionSeconds": 29.2,
        "expectedReductionPercent": 67.6
      },
      "switch": {
        "expectedReductionSeconds": 44.2,
        "expectedReductionPercent": 71.2
      }
    }
  },
  "overall": {
    "keyboard": {
      "label": "키보드 사용자",
      "variantAExpectedSeconds": 101,
      "variantBExpectedSeconds": 34.1,
      "expectedReductionSeconds": 66.9,
      "expectedReductionPercent": 66.2
    },
    "screenReader": {
      "label": "화면낭독 사용자",
      "variantAExpectedSeconds": 174.4,
      "variantBExpectedSeconds": 56.7,
      "expectedReductionSeconds": 117.7,
      "expectedReductionPercent": 67.5
    },
    "switch": {
      "label": "스위치 사용자",
      "variantAExpectedSeconds": 247.9,
      "variantBExpectedSeconds": 78,
      "expectedReductionSeconds": 169.9,
      "expectedReductionPercent": 68.5
    }
  },
  "measurementRules": [
    "실제 계측은 수행 탭에서 첫 조작이 들어갈 때 시작합니다.",
    "수행 탭이 숨겨져 있는 동안의 시간은 실제 완료 시간에서 제외합니다.",
    "수행 탭 맨 아래의 보조 버튼 조작은 실제 지표에서 제외합니다."
  ],
  "actualMeasurementScope": "과업 내용 확인은 메인 창에서 진행하고, 새 탭의 실제 댓글 목록 조작만 기록합니다."
};
