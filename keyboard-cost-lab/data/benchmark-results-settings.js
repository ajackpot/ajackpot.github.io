export const benchmarkResultsSettings = {
  "generatedAt": "2026-04-01T00:15:01.186Z",
  "variants": {
    "variantA": {
      "label": "비교안 A · 조작 부담이 큰 구조",
      "description": "상단 보조 링크와 길게 이어진 모든 설정 묶음을 차례로 지나야 원하는 설정에 도달하고, 각 설정마다 현재 상태, 변경 시각, 설명 보기, 값 선택 버튼이 흩어져 있으며, 설명 대화상자를 닫으면 설정 화면 제목 근처로 돌아와 다시 위치를 찾아야 하는 구조.",
      "tasks": {
        "task1_notifications_sms_off_day_before_on": {
          "title": "알림 설정에서 문자 알림 끄고 상담 하루 전 알림 켜기",
          "assumptions": [
            "상단 보조 링크와 안내 링크를 먼저 지나야 알림 설정 첫 묶음에 도달한다.",
            "각 설정마다 설명 보기와 값 선택 버튼이 따로 나뉘어 있어 순차 이동이 길어진다.",
            "저장 버튼은 묶음 맨 아래에 있어 필요한 설정을 바꾼 뒤 다시 한 번 이동해야 한다."
          ],
          "structural": {
            "totals": {
              "navMoves": 24,
              "activations": 3,
              "decisions": 7,
              "waits": 1,
              "speechUnits": 12,
              "scanSteps": 29,
              "contextResets": 0
            },
            "byBucket": {
              "entry": {
                "navMoves": 10,
                "activations": 0,
                "decisions": 2,
                "waits": 0,
                "speechUnits": 4,
                "scanSteps": 12,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 14,
                "activations": 3,
                "decisions": 5,
                "waits": 1,
                "speechUnits": 8,
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
                  "milliseconds": 14520,
                  "seconds": 14.5
                },
                "expected": {
                  "milliseconds": 21330,
                  "seconds": 21.3
                },
                "upper": {
                  "milliseconds": 29920,
                  "seconds": 29.9
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 5340,
                    "seconds": 5.3
                  },
                  "repeated": {
                    "milliseconds": 9180,
                    "seconds": 9.2
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 7800,
                    "seconds": 7.8
                  },
                  "repeated": {
                    "milliseconds": 13530,
                    "seconds": 13.5
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 10900,
                    "seconds": 10.9
                  },
                  "repeated": {
                    "milliseconds": 19020,
                    "seconds": 19
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
                  "milliseconds": 24520,
                  "seconds": 24.5
                },
                "expected": {
                  "milliseconds": 34760,
                  "seconds": 34.8
                },
                "upper": {
                  "milliseconds": 48510,
                  "seconds": 48.5
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 9040,
                    "seconds": 9
                  },
                  "repeated": {
                    "milliseconds": 15480,
                    "seconds": 15.5
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 12760,
                    "seconds": 12.8
                  },
                  "repeated": {
                    "milliseconds": 22000,
                    "seconds": 22
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 17760,
                    "seconds": 17.8
                  },
                  "repeated": {
                    "milliseconds": 30750,
                    "seconds": 30.8
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
                  "milliseconds": 33970,
                  "seconds": 34
                },
                "expected": {
                  "milliseconds": 50060,
                  "seconds": 50.1
                },
                "upper": {
                  "milliseconds": 74570,
                  "seconds": 74.6
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 12600,
                    "seconds": 12.6
                  },
                  "repeated": {
                    "milliseconds": 21370,
                    "seconds": 21.4
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 18600,
                    "seconds": 18.6
                  },
                  "repeated": {
                    "milliseconds": 31460,
                    "seconds": 31.5
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 27900,
                    "seconds": 27.9
                  },
                  "repeated": {
                    "milliseconds": 46670,
                    "seconds": 46.7
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
        "task2_security_help_then_login_alert_on": {
          "title": "보안 설정에서 로그인 확인 단계 설명을 열었다가 닫고 새 기기 로그인 알림 켜기",
          "assumptions": [
            "보안 설정은 예약 편의 묶음 뒤에 있어 앞부분 설정을 지난 뒤에야 도달할 수 있다.",
            "로그인 확인 단계 설명을 닫으면 방금 쓰던 설명 보기 버튼으로 돌아가지 않고 설정 화면 제목 근처로 돌아온다.",
            "설명 확인 뒤 새 기기 로그인 알림과 저장 버튼을 다시 찾아야 해 복구 비용이 커진다."
          ],
          "structural": {
            "totals": {
              "navMoves": 38,
              "activations": 4,
              "decisions": 10,
              "waits": 1,
              "speechUnits": 17,
              "scanSteps": 45,
              "contextResets": 2
            },
            "byBucket": {
              "entry": {
                "navMoves": 17,
                "activations": 0,
                "decisions": 3,
                "waits": 0,
                "speechUnits": 6,
                "scanSteps": 20,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 5,
                "activations": 1,
                "decisions": 2,
                "waits": 0,
                "speechUnits": 3,
                "scanSteps": 6,
                "contextResets": 0
              },
              "recovery": {
                "navMoves": 16,
                "activations": 3,
                "decisions": 5,
                "waits": 1,
                "speechUnits": 8,
                "scanSteps": 19,
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
                  "milliseconds": 23308,
                  "seconds": 23.3
                },
                "expected": {
                  "milliseconds": 36408,
                  "seconds": 36.4
                },
                "upper": {
                  "milliseconds": 55190,
                  "seconds": 55.2
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 8910,
                    "seconds": 8.9
                  },
                  "repeated": {
                    "milliseconds": 3310,
                    "seconds": 3.3
                  },
                  "recovery": {
                    "milliseconds": 11088,
                    "seconds": 11.1
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 13000,
                    "seconds": 13
                  },
                  "repeated": {
                    "milliseconds": 4870,
                    "seconds": 4.9
                  },
                  "recovery": {
                    "milliseconds": 18538,
                    "seconds": 18.5
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 18150,
                    "seconds": 18.1
                  },
                  "repeated": {
                    "milliseconds": 6850,
                    "seconds": 6.8
                  },
                  "recovery": {
                    "milliseconds": 30190,
                    "seconds": 30.2
                  }
                }
              }
            },
            "screenReader": {
              "label": "화면낭독 사용자",
              "description": "키보드 비용에 발화 청취와 문맥 재구축 비용을 더한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 43016,
                  "seconds": 43
                },
                "expected": {
                  "milliseconds": 67902,
                  "seconds": 67.9
                },
                "upper": {
                  "milliseconds": 104535,
                  "seconds": 104.5
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 14960,
                    "seconds": 15
                  },
                  "repeated": {
                    "milliseconds": 5640,
                    "seconds": 5.6
                  },
                  "recovery": {
                    "milliseconds": 22416,
                    "seconds": 22.4
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 21100,
                    "seconds": 21.1
                  },
                  "repeated": {
                    "milliseconds": 8000,
                    "seconds": 8
                  },
                  "recovery": {
                    "milliseconds": 38802,
                    "seconds": 38.8
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 29340,
                    "seconds": 29.3
                  },
                  "repeated": {
                    "milliseconds": 11190,
                    "seconds": 11.2
                  },
                  "recovery": {
                    "milliseconds": 64005,
                    "seconds": 64
                  }
                }
              }
            },
            "switch": {
              "label": "스위치 사용자",
              "description": "자동 스캔 기반 순차 입력을 가정한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 58651,
                  "seconds": 58.7
                },
                "expected": {
                  "milliseconds": 98409,
                  "seconds": 98.4
                },
                "upper": {
                  "milliseconds": 169477,
                  "seconds": 169.5
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 20800,
                    "seconds": 20.8
                  },
                  "repeated": {
                    "milliseconds": 7600,
                    "seconds": 7.6
                  },
                  "recovery": {
                    "milliseconds": 30251,
                    "seconds": 30.3
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 30700,
                    "seconds": 30.7
                  },
                  "repeated": {
                    "milliseconds": 11180,
                    "seconds": 11.2
                  },
                  "recovery": {
                    "milliseconds": 56529,
                    "seconds": 56.5
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 46050,
                    "seconds": 46
                  },
                  "repeated": {
                    "milliseconds": 16600,
                    "seconds": 16.6
                  },
                  "recovery": {
                    "milliseconds": 106827,
                    "seconds": 106.8
                  }
                }
              }
            }
          }
        },
        "task3_display_text_110_contrast_on": {
          "title": "화면 설정에서 글자 크기 110%와 높은 대비 켜기",
          "assumptions": [
            "화면 설정은 가장 아래쪽에 있어 앞선 모든 설정 묶음을 지나야 한다.",
            "글자 크기 선택은 각 값 버튼이 따로 나뉘어 있고, 높은 대비와 저장 버튼도 이어서 다시 찾아야 한다.",
            "같은 화면 안에 관련 없는 움직임 줄이기 설정과 도움말 링크가 섞여 있어 목표 설정을 가려 낸 뒤 이동해야 한다."
          ],
          "structural": {
            "totals": {
              "navMoves": 38,
              "activations": 3,
              "decisions": 9,
              "waits": 1,
              "speechUnits": 15,
              "scanSteps": 44,
              "contextResets": 0
            },
            "byBucket": {
              "entry": {
                "navMoves": 22,
                "activations": 0,
                "decisions": 4,
                "waits": 0,
                "speechUnits": 7,
                "scanSteps": 25,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 16,
                "activations": 3,
                "decisions": 5,
                "waits": 1,
                "speechUnits": 8,
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
                  "milliseconds": 21660,
                  "seconds": 21.7
                },
                "expected": {
                  "milliseconds": 31730,
                  "seconds": 31.7
                },
                "upper": {
                  "milliseconds": 44420,
                  "seconds": 44.4
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 11580,
                    "seconds": 11.6
                  },
                  "repeated": {
                    "milliseconds": 10080,
                    "seconds": 10.1
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 16900,
                    "seconds": 16.9
                  },
                  "repeated": {
                    "milliseconds": 14830,
                    "seconds": 14.8
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 23600,
                    "seconds": 23.6
                  },
                  "repeated": {
                    "milliseconds": 20820,
                    "seconds": 20.8
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
                  "milliseconds": 36200,
                  "seconds": 36.2
                },
                "expected": {
                  "milliseconds": 51200,
                  "seconds": 51.2
                },
                "upper": {
                  "milliseconds": 71330,
                  "seconds": 71.3
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 19320,
                    "seconds": 19.3
                  },
                  "repeated": {
                    "milliseconds": 16880,
                    "seconds": 16.9
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 27240,
                    "seconds": 27.2
                  },
                  "repeated": {
                    "milliseconds": 23960,
                    "seconds": 24
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 37880,
                    "seconds": 37.9
                  },
                  "repeated": {
                    "milliseconds": 33450,
                    "seconds": 33.5
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
                  "milliseconds": 49420,
                  "seconds": 49.4
                },
                "expected": {
                  "milliseconds": 72860,
                  "seconds": 72.9
                },
                "upper": {
                  "milliseconds": 108770,
                  "seconds": 108.8
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 26150,
                    "seconds": 26.1
                  },
                  "repeated": {
                    "milliseconds": 23270,
                    "seconds": 23.3
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 38600,
                    "seconds": 38.6
                  },
                  "repeated": {
                    "milliseconds": 34260,
                    "seconds": 34.3
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 57900,
                    "seconds": 57.9
                  },
                  "repeated": {
                    "milliseconds": 50870,
                    "seconds": 50.9
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
      "description": "설정 항목으로 바로 이동한 뒤, 설정 묶음을 한 번만 선택하고, 묶음 안의 핵심 설정을 가까운 자리에서 바꾸며, 설명 대화상자를 닫으면 방금 누른 설명 보기 버튼으로 돌아오는 구조.",
      "tasks": {
        "task1_notifications_sms_off_day_before_on": {
          "title": "알림 설정에서 문자 알림 끄고 상담 하루 전 알림 켜기",
          "assumptions": [
            "맨 앞의 설정 항목으로 바로 이동 링크로 첫 진입 부담을 줄인다.",
            "알림 설정은 처음 열리는 묶음이라 별도 긴 진입 없이 바로 핵심 설정을 바꿀 수 있다.",
            "묶음 안에서 저장 버튼이 가까이 있어 설정을 바꾼 뒤 바로 저장할 수 있다."
          ],
          "structural": {
            "totals": {
              "navMoves": 6,
              "activations": 4,
              "decisions": 4,
              "waits": 1,
              "speechUnits": 5,
              "scanSteps": 7,
              "contextResets": 0
            },
            "byBucket": {
              "entry": {
                "navMoves": 2,
                "activations": 1,
                "decisions": 1,
                "waits": 0,
                "speechUnits": 2,
                "scanSteps": 3,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 4,
                "activations": 3,
                "decisions": 3,
                "waits": 1,
                "speechUnits": 3,
                "scanSteps": 4,
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
                  "milliseconds": 5380,
                  "seconds": 5.4
                },
                "expected": {
                  "milliseconds": 8000,
                  "seconds": 8
                },
                "upper": {
                  "milliseconds": 11320,
                  "seconds": 11.3
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 1540,
                    "seconds": 1.5
                  },
                  "repeated": {
                    "milliseconds": 3840,
                    "seconds": 3.8
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 2270,
                    "seconds": 2.3
                  },
                  "repeated": {
                    "milliseconds": 5730,
                    "seconds": 5.7
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 3200,
                    "seconds": 3.2
                  },
                  "repeated": {
                    "milliseconds": 8120,
                    "seconds": 8.1
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
                  "milliseconds": 8960,
                  "seconds": 9
                },
                "expected": {
                  "milliseconds": 12820,
                  "seconds": 12.8
                },
                "upper": {
                  "milliseconds": 18000,
                  "seconds": 18
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 2680,
                    "seconds": 2.7
                  },
                  "repeated": {
                    "milliseconds": 6280,
                    "seconds": 6.3
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 3820,
                    "seconds": 3.8
                  },
                  "repeated": {
                    "milliseconds": 9000,
                    "seconds": 9
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 5350,
                    "seconds": 5.3
                  },
                  "repeated": {
                    "milliseconds": 12650,
                    "seconds": 12.7
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
                  "milliseconds": 11970,
                  "seconds": 12
                },
                "expected": {
                  "milliseconds": 17540,
                  "seconds": 17.5
                },
                "upper": {
                  "milliseconds": 25620,
                  "seconds": 25.6
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 4150,
                    "seconds": 4.2
                  },
                  "repeated": {
                    "milliseconds": 7820,
                    "seconds": 7.8
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 6080,
                    "seconds": 6.1
                  },
                  "repeated": {
                    "milliseconds": 11460,
                    "seconds": 11.5
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 8950,
                    "seconds": 8.9
                  },
                  "repeated": {
                    "milliseconds": 16670,
                    "seconds": 16.7
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
        "task2_security_help_then_login_alert_on": {
          "title": "보안 설정에서 로그인 확인 단계 설명을 열었다가 닫고 새 기기 로그인 알림 켜기",
          "assumptions": [
            "설정 묶음 선택은 한 번만 들어간 뒤 방향키로 이동해 보안 설정으로 갈 수 있다.",
            "설명 대화상자를 닫으면 같은 설명 보기 버튼으로 초점이 돌아와 다음 설정으로 이어서 이동하기 쉽다.",
            "새 기기 로그인 알림과 저장 버튼이 같은 묶음 안에 가까이 있어 복구 비용이 작다."
          ],
          "structural": {
            "totals": {
              "navMoves": 10,
              "activations": 4,
              "decisions": 6,
              "waits": 1,
              "speechUnits": 6,
              "scanSteps": 11,
              "contextResets": 0
            },
            "byBucket": {
              "entry": {
                "navMoves": 3,
                "activations": 0,
                "decisions": 2,
                "waits": 0,
                "speechUnits": 2,
                "scanSteps": 4,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 2,
                "activations": 1,
                "decisions": 1,
                "waits": 0,
                "speechUnits": 1,
                "scanSteps": 2,
                "contextResets": 0
              },
              "recovery": {
                "navMoves": 5,
                "activations": 3,
                "decisions": 3,
                "waits": 1,
                "speechUnits": 3,
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
                  "milliseconds": 8449,
                  "seconds": 8.4
                },
                "expected": {
                  "milliseconds": 13496,
                  "seconds": 13.5
                },
                "upper": {
                  "milliseconds": 20879,
                  "seconds": 20.9
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 2190,
                    "seconds": 2.2
                  },
                  "repeated": {
                    "milliseconds": 1540,
                    "seconds": 1.5
                  },
                  "recovery": {
                    "milliseconds": 4719,
                    "seconds": 4.7
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 3250,
                    "seconds": 3.3
                  },
                  "repeated": {
                    "milliseconds": 2270,
                    "seconds": 2.3
                  },
                  "recovery": {
                    "milliseconds": 7976,
                    "seconds": 8
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 4600,
                    "seconds": 4.6
                  },
                  "repeated": {
                    "milliseconds": 3200,
                    "seconds": 3.2
                  },
                  "recovery": {
                    "milliseconds": 13079,
                    "seconds": 13.1
                  }
                }
              }
            },
            "screenReader": {
              "label": "화면낭독 사용자",
              "description": "키보드 비용에 발화 청취와 문맥 재구축 비용을 더한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 14716,
                  "seconds": 14.7
                },
                "expected": {
                  "milliseconds": 23471,
                  "seconds": 23.5
                },
                "upper": {
                  "milliseconds": 36440,
                  "seconds": 36.4
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 3820,
                    "seconds": 3.8
                  },
                  "repeated": {
                    "milliseconds": 2520,
                    "seconds": 2.5
                  },
                  "recovery": {
                    "milliseconds": 8376,
                    "seconds": 8.4
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 5420,
                    "seconds": 5.4
                  },
                  "repeated": {
                    "milliseconds": 3580,
                    "seconds": 3.6
                  },
                  "recovery": {
                    "milliseconds": 14471,
                    "seconds": 14.5
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 7630,
                    "seconds": 7.6
                  },
                  "repeated": {
                    "milliseconds": 5010,
                    "seconds": 5
                  },
                  "recovery": {
                    "milliseconds": 23800,
                    "seconds": 23.8
                  }
                }
              }
            },
            "switch": {
              "label": "스위치 사용자",
              "description": "자동 스캔 기반 순차 입력을 가정한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 19601,
                  "seconds": 19.6
                },
                "expected": {
                  "milliseconds": 33299,
                  "seconds": 33.3
                },
                "upper": {
                  "milliseconds": 57367,
                  "seconds": 57.4
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 5000,
                    "seconds": 5
                  },
                  "repeated": {
                    "milliseconds": 3200,
                    "seconds": 3.2
                  },
                  "recovery": {
                    "milliseconds": 11401,
                    "seconds": 11.4
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 7400,
                    "seconds": 7.4
                  },
                  "repeated": {
                    "milliseconds": 4680,
                    "seconds": 4.7
                  },
                  "recovery": {
                    "milliseconds": 21219,
                    "seconds": 21.2
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 11100,
                    "seconds": 11.1
                  },
                  "repeated": {
                    "milliseconds": 6850,
                    "seconds": 6.8
                  },
                  "recovery": {
                    "milliseconds": 39417,
                    "seconds": 39.4
                  }
                }
              }
            }
          }
        },
        "task3_display_text_110_contrast_on": {
          "title": "화면 설정에서 글자 크기 110%와 높은 대비 켜기",
          "assumptions": [
            "설정 묶음 선택에서 화면 설정으로 빠르게 이동할 수 있다.",
            "글자 크기 선택은 한 묶음 안에서 바로 이동해 110%를 고를 수 있다.",
            "높은 대비와 저장 버튼이 같은 묶음 안에 가까이 있어 순차 이동 비용을 줄인다."
          ],
          "structural": {
            "totals": {
              "navMoves": 9,
              "activations": 2,
              "decisions": 5,
              "waits": 1,
              "speechUnits": 5,
              "scanSteps": 10,
              "contextResets": 0
            },
            "byBucket": {
              "entry": {
                "navMoves": 4,
                "activations": 0,
                "decisions": 2,
                "waits": 0,
                "speechUnits": 2,
                "scanSteps": 5,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 5,
                "activations": 2,
                "decisions": 3,
                "waits": 1,
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
                  "milliseconds": 6710,
                  "seconds": 6.7
                },
                "expected": {
                  "milliseconds": 9960,
                  "seconds": 10
                },
                "upper": {
                  "milliseconds": 14070,
                  "seconds": 14.1
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 2640,
                    "seconds": 2.6
                  },
                  "repeated": {
                    "milliseconds": 4070,
                    "seconds": 4.1
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 3900,
                    "seconds": 3.9
                  },
                  "repeated": {
                    "milliseconds": 6060,
                    "seconds": 6.1
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 5500,
                    "seconds": 5.5
                  },
                  "repeated": {
                    "milliseconds": 8570,
                    "seconds": 8.6
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
                  "milliseconds": 11240,
                  "seconds": 11.2
                },
                "expected": {
                  "milliseconds": 16000,
                  "seconds": 16
                },
                "upper": {
                  "milliseconds": 22460,
                  "seconds": 22.5
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 4520,
                    "seconds": 4.5
                  },
                  "repeated": {
                    "milliseconds": 6720,
                    "seconds": 6.7
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 6400,
                    "seconds": 6.4
                  },
                  "repeated": {
                    "milliseconds": 9600,
                    "seconds": 9.6
                  },
                  "recovery": {
                    "milliseconds": 0,
                    "seconds": 0
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 8980,
                    "seconds": 9
                  },
                  "repeated": {
                    "milliseconds": 13480,
                    "seconds": 13.5
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
                  "milliseconds": 14020,
                  "seconds": 14
                },
                "expected": {
                  "milliseconds": 20680,
                  "seconds": 20.7
                },
                "upper": {
                  "milliseconds": 30670,
                  "seconds": 30.7
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 5950,
                    "seconds": 6
                  },
                  "repeated": {
                    "milliseconds": 8070,
                    "seconds": 8.1
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
                    "milliseconds": 11880,
                    "seconds": 11.9
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
                    "milliseconds": 17470,
                    "seconds": 17.5
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
    "task1_notifications_sms_off_day_before_on": {
      "keyboard": {
        "expectedReductionSeconds": 13.3,
        "expectedReductionPercent": 62.4
      },
      "screenReader": {
        "expectedReductionSeconds": 22,
        "expectedReductionPercent": 63.2
      },
      "switch": {
        "expectedReductionSeconds": 32.6,
        "expectedReductionPercent": 65.1
      }
    },
    "task2_security_help_then_login_alert_on": {
      "keyboard": {
        "expectedReductionSeconds": 22.9,
        "expectedReductionPercent": 62.9
      },
      "screenReader": {
        "expectedReductionSeconds": 44.4,
        "expectedReductionPercent": 65.4
      },
      "switch": {
        "expectedReductionSeconds": 65.1,
        "expectedReductionPercent": 66.2
      }
    },
    "task3_display_text_110_contrast_on": {
      "keyboard": {
        "expectedReductionSeconds": 21.7,
        "expectedReductionPercent": 68.5
      },
      "screenReader": {
        "expectedReductionSeconds": 35.2,
        "expectedReductionPercent": 68.8
      },
      "switch": {
        "expectedReductionSeconds": 52.2,
        "expectedReductionPercent": 71.6
      }
    }
  },
  "overall": {
    "keyboard": {
      "label": "키보드 사용자",
      "variantAExpectedSeconds": 89.4,
      "variantBExpectedSeconds": 31.5,
      "expectedReductionSeconds": 57.9,
      "expectedReductionPercent": 64.8
    },
    "screenReader": {
      "label": "화면낭독 사용자",
      "variantAExpectedSeconds": 153.9,
      "variantBExpectedSeconds": 52.3,
      "expectedReductionSeconds": 101.6,
      "expectedReductionPercent": 66
    },
    "switch": {
      "label": "스위치 사용자",
      "variantAExpectedSeconds": 221.4,
      "variantBExpectedSeconds": 71.5,
      "expectedReductionSeconds": 149.9,
      "expectedReductionPercent": 67.7
    }
  },
  "measurementRules": [
    "실제 계측은 수행 탭에서 첫 조작이 들어갈 때 시작합니다.",
    "수행 탭이 숨겨져 있는 동안의 시간은 실제 완료 시간에서 제외합니다.",
    "수행 탭 맨 아래의 보조 버튼 조작은 실제 지표에서 제외합니다."
  ],
  "actualMeasurementScope": "과업 내용 확인은 메인 창에서 진행하고, 새 탭의 실제 설정 변경과 저장 조작만 기록합니다."
};
