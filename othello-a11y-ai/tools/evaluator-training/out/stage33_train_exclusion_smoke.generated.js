const GENERATED_EVALUATION_PROFILE = Object.freeze({
  "version": 1,
  "name": "trained-phase-linear-v1",
  "description": "회귀 기반으로 재추정한 phase-bucket linear evaluator입니다.",
  "source": {
    "inputFiles": [
      "/mnt/data/stage33/othello-a11y-ai-stage29/tools/evaluator-training/out/synthetic.jsonl"
    ],
    "targetScale": 3000,
    "holdoutMod": 10,
    "holdoutResidue": 0,
    "regularization": 5000,
    "seenSamples": 200,
    "skipDiagnostics": true,
    "keepParityAliases": false,
    "globalExcludedFeatures": [],
    "bucketExcludedFeatures": [
      {
        "key": "opening-a",
        "minEmpties": 52,
        "maxEmpties": 60,
        "excludedFeatures": [
          "parityGlobal",
          "parityRegion"
        ]
      },
      {
        "key": "opening-b",
        "minEmpties": 44,
        "maxEmpties": 51,
        "excludedFeatures": [
          "parityGlobal",
          "parityRegion"
        ]
      },
      {
        "key": "midgame-a",
        "minEmpties": 36,
        "maxEmpties": 43,
        "excludedFeatures": [
          "parityGlobal",
          "parityRegion"
        ]
      },
      {
        "key": "midgame-b",
        "minEmpties": 28,
        "maxEmpties": 35,
        "excludedFeatures": [
          "parityGlobal",
          "parityRegion"
        ]
      },
      {
        "key": "midgame-c",
        "minEmpties": 20,
        "maxEmpties": 27,
        "excludedFeatures": [
          "parityGlobal",
          "parityRegion"
        ]
      },
      {
        "key": "late-a",
        "minEmpties": 13,
        "maxEmpties": 19,
        "excludedFeatures": [
          "edgePattern",
          "potentialMobility"
        ]
      },
      {
        "key": "late-b",
        "minEmpties": 7,
        "maxEmpties": 12,
        "excludedFeatures": [
          "potentialMobility"
        ]
      },
      {
        "key": "endgame",
        "minEmpties": 0,
        "maxEmpties": 6,
        "excludedFeatures": []
      }
    ]
  },
  "diagnostics": {
    "trainCountsByBucket": [
      {
        "key": "opening-a",
        "minEmpties": 52,
        "maxEmpties": 60,
        "trainCount": 0,
        "holdoutCount": 0
      },
      {
        "key": "opening-b",
        "minEmpties": 44,
        "maxEmpties": 51,
        "trainCount": 0,
        "holdoutCount": 0
      },
      {
        "key": "midgame-a",
        "minEmpties": 36,
        "maxEmpties": 43,
        "trainCount": 0,
        "holdoutCount": 0
      },
      {
        "key": "midgame-b",
        "minEmpties": 28,
        "maxEmpties": 35,
        "trainCount": 180,
        "holdoutCount": 20
      },
      {
        "key": "midgame-c",
        "minEmpties": 20,
        "maxEmpties": 27,
        "trainCount": 0,
        "holdoutCount": 0
      },
      {
        "key": "late-a",
        "minEmpties": 13,
        "maxEmpties": 19,
        "trainCount": 0,
        "holdoutCount": 0
      },
      {
        "key": "late-b",
        "minEmpties": 7,
        "maxEmpties": 12,
        "trainCount": 0,
        "holdoutCount": 0
      },
      {
        "key": "endgame",
        "minEmpties": 0,
        "maxEmpties": 6,
        "trainCount": 0,
        "holdoutCount": 0
      }
    ],
    "excludedFeatureSummaryByBucket": [
      {
        "key": "opening-a",
        "minEmpties": 52,
        "maxEmpties": 60,
        "excludedFeatures": [
          "parityGlobal",
          "parityRegion"
        ],
        "activeFeatureCount": 18
      },
      {
        "key": "opening-b",
        "minEmpties": 44,
        "maxEmpties": 51,
        "excludedFeatures": [
          "parityGlobal",
          "parityRegion"
        ],
        "activeFeatureCount": 18
      },
      {
        "key": "midgame-a",
        "minEmpties": 36,
        "maxEmpties": 43,
        "excludedFeatures": [
          "parityGlobal",
          "parityRegion"
        ],
        "activeFeatureCount": 18
      },
      {
        "key": "midgame-b",
        "minEmpties": 28,
        "maxEmpties": 35,
        "excludedFeatures": [
          "parityGlobal",
          "parityRegion"
        ],
        "activeFeatureCount": 18
      },
      {
        "key": "midgame-c",
        "minEmpties": 20,
        "maxEmpties": 27,
        "excludedFeatures": [
          "parityGlobal",
          "parityRegion"
        ],
        "activeFeatureCount": 18
      },
      {
        "key": "late-a",
        "minEmpties": 13,
        "maxEmpties": 19,
        "excludedFeatures": [
          "edgePattern",
          "potentialMobility"
        ],
        "activeFeatureCount": 18
      },
      {
        "key": "late-b",
        "minEmpties": 7,
        "maxEmpties": 12,
        "excludedFeatures": [
          "potentialMobility"
        ],
        "activeFeatureCount": 19
      },
      {
        "key": "endgame",
        "minEmpties": 0,
        "maxEmpties": 6,
        "excludedFeatures": [],
        "activeFeatureCount": 20
      }
    ],
    "skipped": true,
    "reason": "--skip-diagnostics option used",
    "createdAt": "2026-03-27T18:40:27.553Z"
  },
  "phaseBuckets": [
    {
      "key": "opening-a",
      "minEmpties": 52,
      "maxEmpties": 60,
      "weights": {
        "bias": 0,
        "mobility": 122.5,
        "potentialMobility": 49.625,
        "corners": 850,
        "cornerAccess": 256.25,
        "cornerMoveBalance": 0,
        "cornerAdjacency": 273.75,
        "cornerOrthAdjacency": 0,
        "cornerDiagonalAdjacency": 0,
        "frontier": 72.5,
        "positional": 13.25,
        "edgePattern": 95,
        "cornerPattern": 105,
        "stability": 145,
        "stableDiscDifferential": 0,
        "discDifferential": 0,
        "discDifferentialRaw": 0,
        "parity": 0,
        "parityGlobal": 0,
        "parityRegion": 0
      }
    },
    {
      "key": "opening-b",
      "minEmpties": 44,
      "maxEmpties": 51,
      "weights": {
        "bias": 0,
        "mobility": 109.21875,
        "potentialMobility": 43.914063,
        "corners": 850,
        "cornerAccess": 316.015625,
        "cornerMoveBalance": 0,
        "cornerAdjacency": 245.859375,
        "cornerOrthAdjacency": 0,
        "cornerDiagonalAdjacency": 0,
        "frontier": 64.53125,
        "positional": 12.453125,
        "edgePattern": 105.625,
        "cornerPattern": 115.625,
        "stability": 171.5625,
        "stableDiscDifferential": 0,
        "discDifferential": 0,
        "discDifferentialRaw": 0,
        "parity": 0,
        "parityGlobal": 0,
        "parityRegion": 0
      }
    },
    {
      "key": "midgame-a",
      "minEmpties": 36,
      "maxEmpties": 43,
      "weights": {
        "bias": 0,
        "mobility": 96.71875,
        "potentialMobility": 38.539063,
        "corners": 850,
        "cornerAccess": 372.265625,
        "cornerMoveBalance": 0,
        "cornerAdjacency": 219.609375,
        "cornerOrthAdjacency": 0,
        "cornerDiagonalAdjacency": 0,
        "frontier": 57.03125,
        "positional": 11.703125,
        "edgePattern": 115.625,
        "cornerPattern": 125.625,
        "stability": 196.5625,
        "stableDiscDifferential": 0,
        "discDifferential": 0,
        "discDifferentialRaw": 0,
        "parity": 0,
        "parityGlobal": 0,
        "parityRegion": 0
      }
    },
    {
      "key": "midgame-b",
      "minEmpties": 28,
      "maxEmpties": 35,
      "weights": {
        "bias": -0.000004,
        "mobility": 84.217642,
        "potentialMobility": 33.163409,
        "corners": 850.001215,
        "cornerAccess": 428.51539,
        "cornerMoveBalance": 0.000094,
        "cornerAdjacency": 193.359389,
        "cornerOrthAdjacency": -0.000309,
        "cornerDiagonalAdjacency": 0.000202,
        "frontier": 49.530692,
        "positional": 10.953484,
        "edgePattern": 125.626118,
        "cornerPattern": 135.627641,
        "stability": 221.560199,
        "stableDiscDifferential": 0.000972,
        "discDifferential": -0.0002,
        "discDifferentialRaw": -0.000068,
        "parity": 0.000425,
        "parityGlobal": 0,
        "parityRegion": 0
      }
    },
    {
      "key": "midgame-c",
      "minEmpties": 20,
      "maxEmpties": 27,
      "weights": {
        "bias": 0,
        "mobility": 71.71875,
        "potentialMobility": 27.789063,
        "corners": 850,
        "cornerAccess": 484.765625,
        "cornerMoveBalance": 0,
        "cornerAdjacency": 167.109375,
        "cornerOrthAdjacency": 0,
        "cornerDiagonalAdjacency": 0,
        "frontier": 42.03125,
        "positional": 10.203125,
        "edgePattern": 135.625,
        "cornerPattern": 145.625,
        "stability": 246.5625,
        "stableDiscDifferential": 0,
        "discDifferential": 0,
        "discDifferentialRaw": 0,
        "parity": 0,
        "parityGlobal": 0,
        "parityRegion": 0
      }
    },
    {
      "key": "late-a",
      "minEmpties": 13,
      "maxEmpties": 19,
      "weights": {
        "bias": 0,
        "mobility": 60,
        "potentialMobility": 22.75,
        "corners": 850,
        "cornerAccess": 537.5,
        "cornerMoveBalance": 0,
        "cornerAdjacency": 142.5,
        "cornerOrthAdjacency": 0,
        "cornerDiagonalAdjacency": 0,
        "frontier": 35,
        "positional": 9.5,
        "edgePattern": 145,
        "cornerPattern": 155,
        "stability": 270,
        "stableDiscDifferential": 0,
        "discDifferential": 24,
        "discDifferentialRaw": 0,
        "parity": 0,
        "parityGlobal": 0,
        "parityRegion": 0
      }
    },
    {
      "key": "late-b",
      "minEmpties": 7,
      "maxEmpties": 12,
      "weights": {
        "bias": 0,
        "mobility": 49.84375,
        "potentialMobility": 18.382813,
        "corners": 850,
        "cornerAccess": 583.203125,
        "cornerMoveBalance": 0,
        "cornerAdjacency": 121.171875,
        "cornerOrthAdjacency": 0,
        "cornerDiagonalAdjacency": 0,
        "frontier": 28.90625,
        "positional": 8.890625,
        "edgePattern": 153.125,
        "cornerPattern": 163.125,
        "stability": 290.3125,
        "stableDiscDifferential": 0,
        "discDifferential": 63,
        "discDifferentialRaw": 0,
        "parity": 42.678571,
        "parityGlobal": 0,
        "parityRegion": 0
      }
    },
    {
      "key": "endgame",
      "minEmpties": 0,
      "maxEmpties": 6,
      "weights": {
        "bias": 0,
        "mobility": 39.6875,
        "potentialMobility": 14.015625,
        "corners": 850,
        "cornerAccess": 628.90625,
        "cornerMoveBalance": 0,
        "cornerAdjacency": 99.84375,
        "cornerOrthAdjacency": 0,
        "cornerDiagonalAdjacency": 0,
        "frontier": 22.8125,
        "positional": 8.28125,
        "edgePattern": 161.25,
        "cornerPattern": 171.25,
        "stability": 310.625,
        "stableDiscDifferential": 0,
        "discDifferential": 102,
        "discDifferentialRaw": 0,
        "parity": 68.214286,
        "parityGlobal": 0,
        "parityRegion": 0
      }
    }
  ]
});
const GENERATED_MOVE_ORDERING_PROFILE = Object.freeze({
  "version": 1,
  "name": "trained-move-ordering-linear-v1",
  "description": "late move-ordering evaluator를 root search teacher로 재추정한 프로필입니다.",
  "featureKeys": [
    "mobility",
    "corners",
    "cornerAdjacency",
    "edgePattern",
    "cornerPattern",
    "discDifferential",
    "parity"
  ],
  "source": {
    "inputFiles": [
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000000.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000001.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000002.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000003.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000004.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000005.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000006.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000007.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000008.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000009.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000010.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000011.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000012.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000013.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000014.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000015.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000016.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000017.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000018.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000019.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000020.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000021.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000022.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000023.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000024.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000025.txt"
    ],
    "teacherEvaluationProfileName": "trained-phase-linear-v1",
    "teacherEvaluationProfilePath": "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\out\\trained-evaluation-profile.json",
    "teacherMoveOrderingProfileName": null,
    "teacherMoveOrderingProfilePath": null,
    "regularization": 5000,
    "scannedSamples": 8539654,
    "eligibleRoots": 499801,
    "acceptedRoots": 2500
  },
  "diagnostics": {
    "bucketCounts": [
      {
        "key": "child-10-10",
        "minEmpties": 10,
        "maxEmpties": 10,
        "trainRootCount": 455,
        "holdoutRootCount": 45,
        "trainMoveCount": 2910,
        "holdoutMoveCount": 285,
        "exactRootCount": 500,
        "depthRootCount": 0
      },
      {
        "key": "child-11-12",
        "minEmpties": 11,
        "maxEmpties": 12,
        "trainRootCount": 450,
        "holdoutRootCount": 50,
        "trainMoveCount": 3214,
        "holdoutMoveCount": 377,
        "exactRootCount": 500,
        "depthRootCount": 0
      },
      {
        "key": "child-13-14",
        "minEmpties": 13,
        "maxEmpties": 14,
        "trainRootCount": 451,
        "holdoutRootCount": 49,
        "trainMoveCount": 3590,
        "holdoutMoveCount": 418,
        "exactRootCount": 248,
        "depthRootCount": 252
      },
      {
        "key": "child-15-16",
        "minEmpties": 15,
        "maxEmpties": 16,
        "trainRootCount": 448,
        "holdoutRootCount": 52,
        "trainMoveCount": 3803,
        "holdoutMoveCount": 451,
        "exactRootCount": 0,
        "depthRootCount": 500
      },
      {
        "key": "child-17-18",
        "minEmpties": 17,
        "maxEmpties": 18,
        "trainRootCount": 446,
        "holdoutRootCount": 54,
        "trainMoveCount": 4130,
        "holdoutMoveCount": 500,
        "exactRootCount": 0,
        "depthRootCount": 500
      }
    ],
    "holdoutMoves": {
      "count": 2031,
      "mae": 69090.98380074119,
      "rmse": 101994.48337997719,
      "meanResidual": -16436.239339787204,
      "stdDevResidual": 100661.43589435666,
      "maxAbsResidual": 505204.49522053514,
      "maeInDiscs": 6.909098380074119,
      "rmseInDiscs": 10.199448337997719
    },
    "holdoutRoots": {
      "count": 250,
      "top1Accuracy": 0.496,
      "top3Accuracy": 0.852,
      "meanBestRank": 2.096,
      "meanRegret": 12662.668,
      "meanRegretInDiscs": 1.2662668,
      "maxRegret": 260000,
      "maxRegretInDiscs": 26
    },
    "byBucket": [
      {
        "key": "child-10-10",
        "minEmpties": 10,
        "maxEmpties": 10,
        "holdoutMoves": {
          "count": 285,
          "mae": 100184.47628364041,
          "rmse": 128506.87247084061,
          "meanResidual": -6758.809851771675,
          "stdDevResidual": 128329.00982094611,
          "maxAbsResidual": 444333.2412206091,
          "maeInDiscs": 10.018447628364042,
          "rmseInDiscs": 12.85068724708406
        },
        "holdoutRoots": {
          "count": 45,
          "top1Accuracy": 0.5111111111111111,
          "top3Accuracy": 0.8444444444444444,
          "meanBestRank": 1.8666666666666667,
          "meanRegret": 27555.555555555555,
          "meanRegretInDiscs": 2.7555555555555555,
          "maxRegret": 140000,
          "maxRegretInDiscs": 14
        }
      },
      {
        "key": "child-11-12",
        "minEmpties": 11,
        "maxEmpties": 12,
        "holdoutMoves": {
          "count": 377,
          "mae": 116379.59930147398,
          "rmse": 141851.64025564928,
          "meanResidual": -38855.10669804908,
          "stdDevResidual": 136426.42165908098,
          "maxAbsResidual": 498062.7385266493,
          "maeInDiscs": 11.637959930147398,
          "rmseInDiscs": 14.185164025564928
        },
        "holdoutRoots": {
          "count": 50,
          "top1Accuracy": 0.68,
          "top3Accuracy": 0.98,
          "meanBestRank": 1.48,
          "meanRegret": 23200,
          "meanRegretInDiscs": 2.32,
          "maxRegret": 260000,
          "maxRegretInDiscs": 26
        }
      },
      {
        "key": "child-13-14",
        "minEmpties": 13,
        "maxEmpties": 14,
        "holdoutMoves": {
          "count": 418,
          "mae": 103586.77380112208,
          "rmse": 136774.83081131647,
          "meanResidual": -19172.493981187352,
          "stdDevResidual": 135424.4062863322,
          "maxAbsResidual": 505204.49522053514,
          "maeInDiscs": 10.358677380112209,
          "rmseInDiscs": 13.677483081131646
        },
        "holdoutRoots": {
          "count": 49,
          "top1Accuracy": 0.4489795918367347,
          "top3Accuracy": 0.8367346938775511,
          "meanBestRank": 2.306122448979592,
          "meanRegret": 8720.448979591836,
          "meanRegretInDiscs": 0.8720448979591836,
          "maxRegret": 60000,
          "maxRegretInDiscs": 6
        }
      },
      {
        "key": "child-15-16",
        "minEmpties": 15,
        "maxEmpties": 16,
        "holdoutMoves": {
          "count": 451,
          "mae": 26848.468602462246,
          "rmse": 33407.21385065386,
          "meanResidual": -11651.333770354693,
          "stdDevResidual": 31309.556985609222,
          "maxAbsResidual": 102951.7783121857,
          "maeInDiscs": 2.6848468602462248,
          "rmseInDiscs": 3.340721385065386
        },
        "holdoutRoots": {
          "count": 52,
          "top1Accuracy": 0.4423076923076923,
          "top3Accuracy": 0.7692307692307693,
          "meanBestRank": 2.519230769230769,
          "meanRegret": 3182.0576923076924,
          "meanRegretInDiscs": 0.31820576923076926,
          "maxRegret": 66066,
          "maxRegretInDiscs": 6.6066
        }
      },
      {
        "key": "child-17-18",
        "minEmpties": 17,
        "maxEmpties": 18,
        "holdoutMoves": {
          "count": 500,
          "mae": 24976.345266464436,
          "rmse": 32024.45971381086,
          "meanResidual": -7077.024103244256,
          "stdDevResidual": 31232.703209994397,
          "maxAbsResidual": 155172.26297213556,
          "maeInDiscs": 2.4976345266464435,
          "rmseInDiscs": 3.2024459713810858
        },
        "holdoutRoots": {
          "count": 54,
          "top1Accuracy": 0.4074074074074074,
          "top3Accuracy": 0.8333333333333334,
          "meanBestRank": 2.259259259259259,
          "meanRegret": 3201.814814814815,
          "meanRegretInDiscs": 0.32018148148148146,
          "maxRegret": 40425,
          "maxRegretInDiscs": 4.0425
        }
      }
    ],
    "teacherConfig": {
      "exactRootMaxEmpties": 14,
      "exactRootTimeLimitMs": 60000,
      "teacherDepth": 6,
      "teacherTimeLimitMs": 4000,
      "teacherExactEndgameEmpties": 14
    },
    "sampling": {
      "sampleStride": 200,
      "sampleResidue": 0,
      "maxRootsPerBucket": 500,
      "holdoutMod": 10,
      "holdoutResidue": 0
    },
    "scanSummary": {
      "scannedSamples": 8539654,
      "eligibleRoots": 499801,
      "acceptedRoots": 2500,
      "skipped": {
        "rootRange": 7645259,
        "noMoves": 0,
        "singleMove": 9472,
        "stride": 497301,
        "bucketFull": 385122,
        "incomplete": 0,
        "timeout": 0,
        "depthShort": 0,
        "other": 0
      }
    },
    "createdAt": "2026-03-27T14:44:20.187Z"
  },
  "trainedBuckets": [
    {
      "key": "child-10-10",
      "minEmpties": 10,
      "maxEmpties": 10,
      "weights": {
        "mobility": 3007.274195,
        "corners": 370.328958,
        "cornerAdjacency": -151.040817,
        "edgePattern": 603.230199,
        "cornerPattern": 3143.744984,
        "discDifferential": 278.746461,
        "parity": 404.265498
      }
    },
    {
      "key": "child-11-12",
      "minEmpties": 11,
      "maxEmpties": 12,
      "weights": {
        "mobility": 3451.352356,
        "corners": 298.129168,
        "cornerAdjacency": -148.055258,
        "edgePattern": 757.844624,
        "cornerPattern": 3339.462719,
        "discDifferential": 669.036309,
        "parity": 231.02145
      }
    },
    {
      "key": "child-13-14",
      "minEmpties": 13,
      "maxEmpties": 14,
      "weights": {
        "mobility": 2360.348677,
        "corners": 184.094342,
        "cornerAdjacency": 120.475607,
        "edgePattern": 561.437857,
        "cornerPattern": 2112.205817,
        "discDifferential": 269.610245,
        "parity": 0
      }
    },
    {
      "key": "child-15-16",
      "minEmpties": 15,
      "maxEmpties": 16,
      "weights": {
        "mobility": 881.675211,
        "corners": 158.373643,
        "cornerAdjacency": 27.705188,
        "edgePattern": 289.784659,
        "cornerPattern": 821.521527,
        "discDifferential": -49.064751,
        "parity": 0
      }
    },
    {
      "key": "child-17-18",
      "minEmpties": 17,
      "maxEmpties": 18,
      "weights": {
        "mobility": 1196.004159,
        "corners": 149.04517,
        "cornerAdjacency": 24.692905,
        "edgePattern": 315.987952,
        "cornerPattern": 926.176946,
        "discDifferential": -123.587635,
        "parity": 0
      }
    }
  ]
});

export { GENERATED_EVALUATION_PROFILE, GENERATED_MOVE_ORDERING_PROFILE };
export default GENERATED_EVALUATION_PROFILE;
