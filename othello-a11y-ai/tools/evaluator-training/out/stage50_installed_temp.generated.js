const GENERATED_EVALUATION_PROFILE = Object.freeze({
  "version": 1,
  "name": "trained-phase-linear-v1",
  "description": "회귀 기반으로 재추정한 phase-bucket linear evaluator입니다.",
  "source": {
    "inputFiles": [
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000000.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000001.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000002.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000003.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000004.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000005.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000006.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000007.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000008.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000009.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000010.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000011.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000012.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000013.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000014.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000015.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000016.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000017.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000018.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000019.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000020.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000021.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000022.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000023.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000024.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000025.txt"
    ],
    "targetScale": 3000,
    "holdoutMod": 10,
    "holdoutResidue": 0,
    "regularization": 5000,
    "seenSamples": 25514097,
    "skipDiagnostics": false,
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
        "excludedFeatures": []
      },
      {
        "key": "late-b",
        "minEmpties": 7,
        "maxEmpties": 12,
        "excludedFeatures": []
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
        "trainCount": 72107,
        "holdoutCount": 7961
      },
      {
        "key": "opening-b",
        "minEmpties": 44,
        "maxEmpties": 51,
        "trainCount": 3540649,
        "holdoutCount": 393380
      },
      {
        "key": "midgame-a",
        "minEmpties": 36,
        "maxEmpties": 43,
        "trainCount": 3600056,
        "holdoutCount": 399944
      },
      {
        "key": "midgame-b",
        "minEmpties": 28,
        "maxEmpties": 35,
        "trainCount": 3600089,
        "holdoutCount": 399911
      },
      {
        "key": "midgame-c",
        "minEmpties": 20,
        "maxEmpties": 27,
        "trainCount": 3599593,
        "holdoutCount": 400407
      },
      {
        "key": "late-a",
        "minEmpties": 13,
        "maxEmpties": 19,
        "trainCount": 3150301,
        "holdoutCount": 349699
      },
      {
        "key": "late-b",
        "minEmpties": 7,
        "maxEmpties": 12,
        "trainCount": 2700422,
        "holdoutCount": 299578
      },
      {
        "key": "endgame",
        "minEmpties": 0,
        "maxEmpties": 6,
        "trainCount": 2699470,
        "holdoutCount": 300530
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
        "excludedFeatures": [],
        "activeFeatureCount": 20
      },
      {
        "key": "late-b",
        "minEmpties": 7,
        "maxEmpties": 12,
        "excludedFeatures": [],
        "activeFeatureCount": 20
      },
      {
        "key": "endgame",
        "minEmpties": 0,
        "maxEmpties": 6,
        "excludedFeatures": [],
        "activeFeatureCount": 20
      }
    ],
    "all": {
      "count": 25514097,
      "mae": 18651.49042884018,
      "rmse": 24372.89129135579,
      "meanResidual": 10.341334753097474,
      "stdDevResidual": 24372.889097459134,
      "maxAbsResidual": 419087,
      "maeInStones": 6.21716347628006,
      "rmseInStones": 8.124297097118596,
      "meanResidualInStones": 0.0034471115843658245,
      "stdDevResidualInStones": 8.124296365819712,
      "maxAbsResidualInStones": 139.69566666666665
    },
    "holdout": {
      "count": 2551410,
      "mae": 18663.84956592629,
      "rmse": 24390.47237279828,
      "meanResidual": 2.3827001540324764,
      "stdDevResidual": 24390.472256415535,
      "maxAbsResidual": 355000,
      "maeInStones": 6.221283188642097,
      "rmseInStones": 8.130157457599426,
      "meanResidualInStones": 0.0007942333846774921,
      "stdDevResidualInStones": 8.130157418805178,
      "maxAbsResidualInStones": 118.33333333333333
    },
    "byBucket": [
      {
        "key": "opening-a",
        "minEmpties": 52,
        "maxEmpties": 60,
        "trainCount": 72107,
        "holdoutCount": 7961,
        "mpcResidualMean": 104.35472930536365,
        "mpcResidualStdDev": 15625.903433315581,
        "holdout": {
          "count": 7961,
          "mae": 11200.211279989951,
          "rmse": 15626.251886387601,
          "meanResidual": 104.35472930536365,
          "stdDevResidual": 15625.903433315581,
          "maxAbsResidual": 275783,
          "maeInStones": 3.7334037599966505,
          "rmseInStones": 5.208750628795867
        },
        "all": {
          "count": 80068,
          "mae": 11344.958909926563,
          "rmse": 15995.568084034048,
          "meanResidual": 119.03164809911576,
          "stdDevResidual": 15995.125188560403,
          "maxAbsResidual": 294115,
          "maeInStones": 3.781652969975521,
          "rmseInStones": 5.33185602801135
        }
      },
      {
        "key": "opening-b",
        "minEmpties": 44,
        "maxEmpties": 51,
        "trainCount": 3540649,
        "holdoutCount": 393380,
        "mpcResidualMean": -31.626544308302403,
        "mpcResidualStdDev": 20421.554909114362,
        "holdout": {
          "count": 393380,
          "mae": 14916.068986730388,
          "rmse": 20421.579398868194,
          "meanResidual": -31.626544308302403,
          "stdDevResidual": 20421.554909114362,
          "maxAbsResidual": 346296,
          "maeInStones": 4.972022995576796,
          "rmseInStones": 6.807193132956065
        },
        "all": {
          "count": 3934029,
          "mae": 14917.697808785853,
          "rmse": 20446.57169599231,
          "meanResidual": 5.696802692608519,
          "stdDevResidual": 20446.57090237365,
          "maxAbsResidual": 419087,
          "maeInStones": 4.972565936261951,
          "rmseInStones": 6.815523898664103
        }
      },
      {
        "key": "midgame-a",
        "minEmpties": 36,
        "maxEmpties": 43,
        "trainCount": 3600056,
        "holdoutCount": 399944,
        "mpcResidualMean": 53.76027143800132,
        "mpcResidualStdDev": 22130.277528513776,
        "holdout": {
          "count": 399944,
          "mae": 16528.474211389595,
          "rmse": 22130.342827345146,
          "meanResidual": 53.76027143800132,
          "stdDevResidual": 22130.277528513776,
          "maxAbsResidual": 355000,
          "maeInStones": 5.509491403796532,
          "rmseInStones": 7.376780942448383
        },
        "all": {
          "count": 4000000,
          "mae": 16489.854699,
          "rmse": 22050.01006908524,
          "meanResidual": 18.6511665,
          "stdDevResidual": 22050.00218096925,
          "maxAbsResidual": 403285,
          "maeInStones": 5.4966182329999995,
          "rmseInStones": 7.350003356361747
        }
      },
      {
        "key": "midgame-b",
        "minEmpties": 28,
        "maxEmpties": 35,
        "trainCount": 3600089,
        "holdoutCount": 399911,
        "mpcResidualMean": 37.98888502691849,
        "mpcResidualStdDev": 25047.307290440935,
        "holdout": {
          "count": 399911,
          "mae": 19052.9863469622,
          "rmse": 25047.33609901782,
          "meanResidual": 37.98888502691849,
          "stdDevResidual": 25047.307290440935,
          "maxAbsResidual": 253552,
          "maeInStones": 6.350995448987399,
          "rmseInStones": 8.34911203300594
        },
        "all": {
          "count": 4000000,
          "mae": 19067.03909775,
          "rmse": 25041.51823445566,
          "meanResidual": 16.15598675,
          "stdDevResidual": 25041.51302279212,
          "maxAbsResidual": 253552,
          "maeInStones": 6.3556796992499995,
          "rmseInStones": 8.347172744818554
        }
      },
      {
        "key": "midgame-c",
        "minEmpties": 20,
        "maxEmpties": 27,
        "trainCount": 3599593,
        "holdoutCount": 400407,
        "mpcResidualMean": 12.251209394441156,
        "mpcResidualStdDev": 26817.787844900537,
        "holdout": {
          "count": 400407,
          "mae": 20927.38468608191,
          "rmse": 26817.790643269378,
          "meanResidual": 12.251209394441156,
          "stdDevResidual": 26817.787844900537,
          "maxAbsResidual": 212675,
          "maeInStones": 6.975794895360637,
          "rmseInStones": 8.93926354775646
        },
        "all": {
          "count": 4000000,
          "mae": 20937.25665425,
          "rmse": 26844.49929718129,
          "meanResidual": 11.54319625,
          "stdDevResidual": 26844.496815380746,
          "maxAbsResidual": 233660,
          "maeInStones": 6.9790855514166665,
          "rmseInStones": 8.948166432393764
        }
      },
      {
        "key": "late-a",
        "minEmpties": 13,
        "maxEmpties": 19,
        "trainCount": 3150301,
        "holdoutCount": 349699,
        "mpcResidualMean": -112.70411696916491,
        "mpcResidualStdDev": 27155.37244235551,
        "holdout": {
          "count": 349699,
          "mae": 21429.874643622086,
          "rmse": 27155.606321734427,
          "meanResidual": -112.70411696916491,
          "stdDevResidual": 27155.37244235551,
          "maxAbsResidual": 180665,
          "maeInStones": 7.143291547874028,
          "rmseInStones": 9.051868773911476
        },
        "all": {
          "count": 3500000,
          "mae": 21404.061378857143,
          "rmse": 27109.665833887568,
          "meanResidual": -1.5095165714285714,
          "stdDevResidual": 27109.665791861225,
          "maxAbsResidual": 236637,
          "maeInStones": 7.134687126285714,
          "rmseInStones": 9.036555277962522
        }
      },
      {
        "key": "late-b",
        "minEmpties": 7,
        "maxEmpties": 12,
        "trainCount": 2700422,
        "holdoutCount": 299578,
        "mpcResidualMean": -13.41526080019227,
        "mpcResidualStdDev": 26231.677968123782,
        "holdout": {
          "count": 299578,
          "mae": 20823.697678067147,
          "rmse": 26231.68139850309,
          "meanResidual": -13.41526080019227,
          "stdDevResidual": 26231.677968123782,
          "maxAbsResidual": 150779,
          "maeInStones": 6.941232559355716,
          "rmseInStones": 8.74389379950103
        },
        "all": {
          "count": 3000000,
          "mae": 20795.154942333334,
          "rmse": 26195.852283221207,
          "meanResidual": 5.325427,
          "stdDevResidual": 26195.851741910836,
          "maxAbsResidual": 163534,
          "maeInStones": 6.931718314111111,
          "rmseInStones": 8.731950761073735
        }
      },
      {
        "key": "endgame",
        "minEmpties": 0,
        "maxEmpties": 6,
        "trainCount": 2699470,
        "holdoutCount": 300530,
        "mpcResidualMean": 64.9599707183975,
        "mpcResidualStdDev": 22568.256472527606,
        "holdout": {
          "count": 300530,
          "mae": 17703.798795461353,
          "rmse": 22568.349962006083,
          "meanResidual": 64.9599707183975,
          "stdDevResidual": 22568.256472527606,
          "maxAbsResidual": 121634,
          "maeInStones": 5.901266265153784,
          "rmseInStones": 7.522783320668695
        },
        "all": {
          "count": 3000000,
          "mae": 17668.210192,
          "rmse": 22543.407915311294,
          "meanResidual": 11.937811333333334,
          "stdDevResidual": 22543.404754490402,
          "maxAbsResidual": 131379,
          "maeInStones": 5.889403397333333,
          "rmseInStones": 7.5144693051037645
        }
      }
    ],
    "createdAt": "2026-03-28T06:29:09.919Z"
  },
  "featureKeys": [
    "mobility",
    "potentialMobility",
    "corners",
    "cornerAccess",
    "cornerMoveBalance",
    "cornerAdjacency",
    "cornerOrthAdjacency",
    "cornerDiagonalAdjacency",
    "frontier",
    "positional",
    "edgePattern",
    "cornerPattern",
    "stability",
    "stableDiscDifferential",
    "discDifferential",
    "discDifferentialRaw",
    "parity",
    "parityGlobal",
    "parityRegion"
  ],
  "phaseBuckets": [
    {
      "key": "opening-a",
      "minEmpties": 52,
      "maxEmpties": 60,
      "weights": {
        "bias": -1739.970763,
        "mobility": 253.50357,
        "potentialMobility": 486.698783,
        "corners": 244.088907,
        "cornerAccess": -1.22501,
        "cornerMoveBalance": -7.361699,
        "cornerAdjacency": 17.796626,
        "cornerOrthAdjacency": 32.902561,
        "cornerDiagonalAdjacency": 237.896852,
        "frontier": 273.873192,
        "positional": 383.281001,
        "edgePattern": 883.572215,
        "cornerPattern": 3327.041732,
        "stability": -460.911093,
        "stableDiscDifferential": 137.500279,
        "discDifferential": 67.605069,
        "discDifferentialRaw": -1329.972723,
        "parity": 48.911905,
        "parityGlobal": 0,
        "parityRegion": 0
      }
    },
    {
      "key": "opening-b",
      "minEmpties": 44,
      "maxEmpties": 51,
      "weights": {
        "bias": -6970.527084,
        "mobility": 342.750349,
        "potentialMobility": 546.905066,
        "corners": 21.444108,
        "cornerAccess": 28.34277,
        "cornerMoveBalance": -2140.140015,
        "cornerAdjacency": 34.996655,
        "cornerOrthAdjacency": 127.39043,
        "cornerDiagonalAdjacency": 239.630336,
        "frontier": 688.707998,
        "positional": 341.053585,
        "edgePattern": -1248.263101,
        "cornerPattern": 2273.279516,
        "stability": 113.340613,
        "stableDiscDifferential": 13065.188336,
        "discDifferential": 544.750823,
        "discDifferentialRaw": -3576.35819,
        "parity": 55.255791,
        "parityGlobal": 0,
        "parityRegion": 0
      }
    },
    {
      "key": "midgame-a",
      "minEmpties": 36,
      "maxEmpties": 43,
      "weights": {
        "bias": -10620.59312,
        "mobility": 386.914734,
        "potentialMobility": 473.60683,
        "corners": 197.025032,
        "cornerAccess": 34.835398,
        "cornerMoveBalance": 3770.351265,
        "cornerAdjacency": 38.122815,
        "cornerOrthAdjacency": 120.979005,
        "cornerDiagonalAdjacency": 205.519344,
        "frontier": 891.223071,
        "positional": 241.619925,
        "edgePattern": -1267.978715,
        "cornerPattern": 1131.273716,
        "stability": 86.117868,
        "stableDiscDifferential": 11368.425158,
        "discDifferential": 322.054831,
        "discDifferentialRaw": -2281.349562,
        "parity": 53.295666,
        "parityGlobal": 0,
        "parityRegion": 0
      }
    },
    {
      "key": "midgame-b",
      "minEmpties": 28,
      "maxEmpties": 35,
      "weights": {
        "bias": -9886.319403,
        "mobility": 440.324455,
        "potentialMobility": 280.93806,
        "corners": 118.912255,
        "cornerAccess": 80.214499,
        "cornerMoveBalance": 6596.880526,
        "cornerAdjacency": -0.670305,
        "cornerOrthAdjacency": 71.60991,
        "cornerDiagonalAdjacency": 90.883635,
        "frontier": 969.574147,
        "positional": 163.329483,
        "edgePattern": -661.559118,
        "cornerPattern": 922.626759,
        "stability": 87.292518,
        "stableDiscDifferential": 7320.04035,
        "discDifferential": -262.012503,
        "discDifferentialRaw": -71.453156,
        "parity": 53.256162,
        "parityGlobal": 0,
        "parityRegion": 0
      }
    },
    {
      "key": "midgame-c",
      "minEmpties": 20,
      "maxEmpties": 27,
      "weights": {
        "bias": -8253.301721,
        "mobility": 576.683718,
        "potentialMobility": -22.143095,
        "corners": 101.94498,
        "cornerAccess": 31.203645,
        "cornerMoveBalance": 9337.338511,
        "cornerAdjacency": -31.308693,
        "cornerOrthAdjacency": 54.941931,
        "cornerDiagonalAdjacency": 30.469095,
        "frontier": 821.537569,
        "positional": 89.796401,
        "edgePattern": -266.349837,
        "cornerPattern": 759.96795,
        "stability": 62.475848,
        "stableDiscDifferential": 4139.506131,
        "discDifferential": -731.568976,
        "discDifferentialRaw": 978.002909,
        "parity": 55.536395,
        "parityGlobal": 0,
        "parityRegion": 0
      }
    },
    {
      "key": "late-a",
      "minEmpties": 13,
      "maxEmpties": 19,
      "weights": {
        "bias": -6825.848836,
        "mobility": 606.374909,
        "potentialMobility": -279.864079,
        "corners": 101.594705,
        "cornerAccess": 18.311727,
        "cornerMoveBalance": 8495.171914,
        "cornerAdjacency": -16.632546,
        "cornerOrthAdjacency": 42.507997,
        "cornerDiagonalAdjacency": -9.982257,
        "frontier": 642.127863,
        "positional": 35.080366,
        "edgePattern": -135.716739,
        "cornerPattern": 662.878263,
        "stability": 13.965033,
        "stableDiscDifferential": 3425.838517,
        "discDifferential": -579.967179,
        "discDifferentialRaw": 645.114544,
        "parity": 50.653864,
        "parityGlobal": 16.607626,
        "parityRegion": 47.73836
      }
    },
    {
      "key": "late-b",
      "minEmpties": 7,
      "maxEmpties": 12,
      "weights": {
        "bias": -3999.164761,
        "mobility": 506.24405,
        "potentialMobility": -319.476161,
        "corners": 98.03629,
        "cornerAccess": 15.447669,
        "cornerMoveBalance": 7104.794629,
        "cornerAdjacency": -12.880264,
        "cornerOrthAdjacency": 42.412662,
        "cornerDiagonalAdjacency": -30.408282,
        "frontier": 455.061453,
        "positional": 5.922032,
        "edgePattern": -95.564593,
        "cornerPattern": 504.72778,
        "stability": -34.715014,
        "stableDiscDifferential": 3024.178614,
        "discDifferential": -150.766709,
        "discDifferentialRaw": 119.948168,
        "parity": 40.003793,
        "parityGlobal": 24.241676,
        "parityRegion": 83.201252
      }
    },
    {
      "key": "endgame",
      "minEmpties": 0,
      "maxEmpties": 6,
      "weights": {
        "bias": -3258.142531,
        "mobility": 195.705442,
        "potentialMobility": -146.372944,
        "corners": 71.703505,
        "cornerAccess": -92.887277,
        "cornerMoveBalance": 13007.356571,
        "cornerAdjacency": 16.942444,
        "cornerOrthAdjacency": 12.064035,
        "cornerDiagonalAdjacency": -31.405703,
        "frontier": 220.454457,
        "positional": 0.42053,
        "edgePattern": -105.94683,
        "cornerPattern": 274.726347,
        "stability": -207.201367,
        "stableDiscDifferential": 3625.402184,
        "discDifferential": 4495.427394,
        "discDifferentialRaw": -7652.907556,
        "parity": -10906.176659,
        "parityGlobal": 2176.323488,
        "parityRegion": 8825.866746
      }
    }
  ]
});
const GENERATED_MOVE_ORDERING_PROFILE = Object.freeze({
  "version": 1,
  "name": "stage44-candidateH2-edgePattern125-cornerPattern125-11-12",
  "description": "Search-cost top-pair follow-up on candidateF: scale child empties 11-12 edgePattern and cornerPattern by 1.25.",
  "stage": {
    "number": 38,
    "tag": "stage38",
    "file": "stage-info.json",
    "label": "Stage 38",
    "updatedAt": "2026-03-30T16:54:58+09:00",
    "kind": "move-ordering-profile",
    "status": "active-adopted-candidateH2",
    "adoptedFrom": "tools/evaluator-training/out/stage44_candidateH2_edgePattern125_cornerPattern125_11_12.json"
  },
  "source": {
    "inputFiles": [
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000000.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000001.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000002.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000003.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000004.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000005.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000006.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000007.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000008.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000009.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000010.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000011.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000012.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000013.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000014.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000015.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000016.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000017.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000018.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000019.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000020.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000021.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000022.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000023.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000024.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000025.txt"
    ],
    "teacherEvaluationProfileName": "trained-phase-linear-v1",
    "teacherEvaluationProfilePath": null,
    "teacherMoveOrderingProfileName": null,
    "teacherMoveOrderingProfilePath": null,
    "regularization": 5000,
    "scannedSamples": 8539654,
    "eligibleRoots": 499801,
    "acceptedRoots": 2500,
    "targetMode": "root-mean",
    "rootWeighting": "uniform",
    "exactRootWeightScale": 1,
    "excludedFeatureKeys": [],
    "derivedFromProfileName": "stage41-candidateF-cornerPattern125-11-12",
    "derivedFromProfilePath": "tools/evaluator-training/out/stage41_candidateF_cornerPattern125_11_12.json",
    "derivedAt": "2026-03-30T05:08:10.351Z",
    "tuning": {
      "type": "search-cost-top-pair",
      "actionChain": [
        {
          "type": "scale",
          "featureKey": "edgePattern",
          "range": {
            "key": "11-12",
            "minEmpties": 11,
            "maxEmpties": 12
          },
          "scale": 1.25
        },
        {
          "type": "scale",
          "featureKey": "cornerPattern",
          "range": {
            "key": "11-12",
            "minEmpties": 11,
            "maxEmpties": 12
          },
          "scale": 1.25
        }
      ]
    },
    "adoptedAt": "2026-03-30T16:54:58+09:00",
    "baselineProfileBackupPath": "tools/evaluator-training/out/stage38_baseline_trained_move_ordering_linear_v2.json",
    "candidateAlias": "candidateH2",
    "candidateAliasAssignedAt": "2026-03-30T00:00:00Z",
    "priorActiveProfileName": "stage41-candidateF-cornerPattern125-11-12",
    "priorActiveProfileBackupPath": "tools/evaluator-training/out/stage44_candidateF_before_candidateH2.json",
    "adoptedFromProfilePath": "tools/evaluator-training/out/stage44_candidateH2_edgePattern125_cornerPattern125_11_12.json",
    "selectedFromTuningSummaryPath": "benchmarks/stage43_top_pair_search_decision_summary_20260330.json",
    "selectedFromSmallValidationPath": "benchmarks/stage43_candidateH2_vs_candidateF_seed1_4_fullsuite_validation_20260330.json",
    "selectedFromBenchmarkSummaryPath": "benchmarks/stage44_candidateH2_current_apples_to_apples_24seed_20260330.json"
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
        "depthRootCount": 0,
        "rootWeightSum": 500
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
        "depthRootCount": 0,
        "rootWeightSum": 500
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
        "depthRootCount": 252,
        "rootWeightSum": 500
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
        "depthRootCount": 500,
        "rootWeightSum": 500
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
        "depthRootCount": 500,
        "rootWeightSum": 500
      }
    ],
    "holdoutMoves": {
      "targetMode": "root-mean",
      "count": 2031,
      "mae": 13879.114784834177,
      "rmse": 28593.034082054575,
      "meanResidual": -20.856251053170038,
      "stdDevResidual": 28593.02647559937,
      "maxAbsResidual": 381621.4263288247,
      "maeInDiscs": 1.3879114784834177,
      "rmseInDiscs": 2.8593034082054576
    },
    "holdoutMovesRawAligned": {
      "alignment": "per-root-mean",
      "count": 2031,
      "mae": 13625.273233211848,
      "rmse": 28471.936171617304,
      "meanResidual": -2.221119508022513e-13,
      "stdDevResidual": 28471.936171617304,
      "maxAbsResidual": 378412.43692501046,
      "maeInDiscs": 1.3625273233211848,
      "rmseInDiscs": 2.8471936171617305
    },
    "holdoutRoots": {
      "count": 250,
      "top1Accuracy": 0.48,
      "top3Accuracy": 0.816,
      "meanBestRank": 2.336,
      "meanRegret": 9883.708,
      "meanRegretInDiscs": 0.9883708000000001,
      "maxRegret": 160000,
      "maxRegretInDiscs": 16
    },
    "holdoutPairwise": {
      "comparablePairs": 6430,
      "correctPairs": 3787,
      "tiedTeacherPairs": 1652,
      "tiedPredictionPairs": 9,
      "accuracy": 0.5889580093312597,
      "weightedAccuracy": 0.6249619325261336,
      "maxTeacherGap": 480000
    },
    "featureContribution": {
      "overall": [
        {
          "key": "mobility",
          "count": 2031,
          "meanContribution": 21.550041356641902,
          "meanAbsContribution": 1098.7110456779553,
          "maxAbsContribution": 7322.504679165473,
          "absContributionShare": 0.15602923013161824
        },
        {
          "key": "corners",
          "count": 2031,
          "meanContribution": -35.402237867934936,
          "meanAbsContribution": 384.47471631478555,
          "maxAbsContribution": 1783.217855263644,
          "absContributionShare": 0.05459970046505918
        },
        {
          "key": "cornerAdjacency",
          "count": 2031,
          "meanContribution": -199.25739957425478,
          "meanAbsContribution": 800.8873639365478,
          "maxAbsContribution": 3519.1054660911204,
          "absContributionShare": 0.11373494360389678
        },
        {
          "key": "edgePattern",
          "count": 2031,
          "meanContribution": 106.13593598136845,
          "meanAbsContribution": 1831.4825533152232,
          "maxAbsContribution": 22160.09914381725,
          "absContributionShare": 0.26009096196619624
        },
        {
          "key": "cornerPattern",
          "count": 2031,
          "meanContribution": -77.28743426330401,
          "meanAbsContribution": 2611.803763270944,
          "maxAbsContribution": 21574.705268554717,
          "absContributionShare": 0.37090528218597413
        },
        {
          "key": "discDifferential",
          "count": 2031,
          "meanContribution": 39.4840335612934,
          "meanAbsContribution": 153.67296834059658,
          "maxAbsContribution": 1013.700711447192,
          "absContributionShare": 0.02182327649889842
        },
        {
          "key": "parity",
          "count": 2031,
          "meanContribution": 123.92080975301975,
          "meanAbsContribution": 160.66769079245813,
          "maxAbsContribution": 845.802204118919,
          "absContributionShare": 0.022816605148356817
        }
      ],
      "byBucket": [
        {
          "key": "child-10-10",
          "minEmpties": 10,
          "maxEmpties": 10,
          "features": [
            {
              "key": "mobility",
              "count": 285,
              "meanContribution": -162.42816887515662,
              "meanAbsContribution": 1209.5361224494475,
              "maxAbsContribution": 4854.6130759300395,
              "absContributionShare": 0.11916305480909033
            },
            {
              "key": "corners",
              "count": 285,
              "meanContribution": -381.67119007397343,
              "meanAbsContribution": 1076.1876179134954,
              "maxAbsContribution": 1783.217855263644,
              "absContributionShare": 0.106025609089364
            },
            {
              "key": "cornerAdjacency",
              "count": 285,
              "meanContribution": -1152.8262015668909,
              "meanAbsContribution": 2150.5234705499165,
              "maxAbsContribution": 3519.1054660911204,
              "absContributionShare": 0.21186878294334313
            },
            {
              "key": "edgePattern",
              "count": 285,
              "meanContribution": 1249.2394975112354,
              "meanAbsContribution": 2623.373278672964,
              "maxAbsContribution": 6637.048363350768,
              "absContributionShare": 0.258453772474476
            },
            {
              "key": "cornerPattern",
              "count": 285,
              "meanContribution": -1059.8880001035486,
              "meanAbsContribution": 1958.3938767345398,
              "maxAbsContribution": 4972.314074559856,
              "absContributionShare": 0.19294024588410627
            },
            {
              "key": "discDifferential",
              "count": 285,
              "meanContribution": 85.8385163845341,
              "meanAbsContribution": 286.44455191303155,
              "maxAbsContribution": 1013.700711447192,
              "absContributionShare": 0.028220412111589925
            },
            {
              "key": "parity",
              "count": 285,
              "meanContribution": 845.8022041189232,
              "meanAbsContribution": 845.8022041189232,
              "maxAbsContribution": 845.802204118919,
              "absContributionShare": 0.08332812268803085
            }
          ]
        },
        {
          "key": "child-11-12",
          "minEmpties": 11,
          "maxEmpties": 12,
          "features": [
            {
              "key": "mobility",
              "count": 377,
              "meanContribution": 84.21835981854359,
              "meanAbsContribution": 1667.1188273357484,
              "maxAbsContribution": 7322.504679165473,
              "absContributionShare": 0.10563178884902039
            },
            {
              "key": "corners",
              "count": 377,
              "meanContribution": 74.8236740312422,
              "meanAbsContribution": 332.171765017483,
              "maxAbsContribution": 641.1028434040527,
              "absContributionShare": 0.021047028663222382
            },
            {
              "key": "cornerAdjacency",
              "count": 377,
              "meanContribution": 52.316824481626874,
              "meanAbsContribution": 1635.341371361472,
              "maxAbsContribution": 2809.3531500409676,
              "absContributionShare": 0.10361830938697254
            },
            {
              "key": "edgePattern",
              "count": 377,
              "meanContribution": -474.13355274596256,
              "meanAbsContribution": 5128.272104987938,
              "maxAbsContribution": 22160.09914381725,
              "absContributionShare": 0.3249369794594193
            },
            {
              "key": "cornerPattern",
              "count": 377,
              "meanContribution": 122.29403080900084,
              "meanAbsContribution": 6754.393393912555,
              "maxAbsContribution": 21574.705268554717,
              "absContributionShare": 0.4279710870575506
            },
            {
              "key": "discDifferential",
              "count": 377,
              "meanContribution": 9.89716961769297,
              "meanAbsContribution": 38.90131938265248,
              "maxAbsContribution": 162.6871937307679,
              "absContributionShare": 0.0024648608651032153
            },
            {
              "key": "parity",
              "count": 377,
              "meanContribution": 28.19505685541111,
              "meanAbsContribution": 226.1603496699984,
              "maxAbsContribution": 226.16034966999993,
              "absContributionShare": 0.014329945718710687
            }
          ]
        },
        {
          "key": "child-13-14",
          "minEmpties": 13,
          "maxEmpties": 14,
          "features": [
            {
              "key": "mobility",
              "count": 418,
              "meanContribution": 264.89345995601553,
              "meanAbsContribution": 1585.0756583930824,
              "maxAbsContribution": 4659.840642338935,
              "absContributionShare": 0.41619942677134586
            },
            {
              "key": "corners",
              "count": 418,
              "meanContribution": 21.426657328009128,
              "meanAbsContribution": 559.3096412863083,
              "maxAbsContribution": 926.5182168732226,
              "absContributionShare": 0.14686008889130295
            },
            {
              "key": "cornerAdjacency",
              "count": 418,
              "meanContribution": -229.26254066217606,
              "meanAbsContribution": 661.3429883136523,
              "maxAbsContribution": 1259.300150346297,
              "absContributionShare": 0.17365137820262436
            },
            {
              "key": "edgePattern",
              "count": 418,
              "meanContribution": -11.782329151069986,
              "meanAbsContribution": 84.21494938001437,
              "maxAbsContribution": 290.24442009916504,
              "absContributionShare": 0.022112643943490426
            },
            {
              "key": "cornerPattern",
              "count": 418,
              "meanContribution": 108.8948264894791,
              "meanAbsContribution": 632.8525423519005,
              "maxAbsContribution": 1859.1029797769036,
              "absContributionShare": 0.1661705319635482
            },
            {
              "key": "discDifferential",
              "count": 418,
              "meanContribution": 55.03741608491537,
              "meanAbsContribution": 285.65650645250895,
              "maxAbsContribution": 982.2785008559255,
              "absContributionShare": 0.07500593022768884
            },
            {
              "key": "parity",
              "count": 418,
              "meanContribution": 0,
              "meanAbsContribution": 0,
              "maxAbsContribution": 0,
              "absContributionShare": 0
            }
          ]
        },
        {
          "key": "child-15-16",
          "minEmpties": 15,
          "maxEmpties": 16,
          "features": [
            {
              "key": "mobility",
              "count": 451,
              "meanContribution": 11.273303610590116,
              "meanAbsContribution": 701.4631190205507,
              "maxAbsContribution": 3029.498225686022,
              "absContributionShare": 0.18044067987322268
            },
            {
              "key": "corners",
              "count": 451,
              "meanContribution": -7.211722811977398,
              "meanAbsContribution": 202.9180830428935,
              "maxAbsContribution": 382.64552802374305,
              "absContributionShare": 0.052197579416513935
            },
            {
              "key": "cornerAdjacency",
              "count": 451,
              "meanContribution": -1.9745718787791098,
              "meanAbsContribution": 79.77959717156716,
              "maxAbsContribution": 141.92641232418634,
              "absContributionShare": 0.02052208357546973
            },
            {
              "key": "edgePattern",
              "count": 451,
              "meanContribution": -53.149603173351004,
              "meanAbsContribution": 814.5456748627863,
              "maxAbsContribution": 3676.9692097011184,
              "absContributionShare": 0.2095294412131854
            },
            {
              "key": "cornerPattern",
              "count": 451,
              "meanContribution": 171.53596931050836,
              "meanAbsContribution": 1968.1904868734098,
              "maxAbsContribution": 6052.185747135726,
              "absContributionShare": 0.5062869592735391
            },
            {
              "key": "discDifferential",
              "count": 451,
              "meanContribution": 38.65209301316614,
              "meanAbsContribution": 120.60290609534222,
              "maxAbsContribution": 514.1635759296341,
              "absContributionShare": 0.031023256648069666
            },
            {
              "key": "parity",
              "count": 451,
              "meanContribution": 0,
              "meanAbsContribution": 0,
              "maxAbsContribution": 0,
              "absContributionShare": 0
            }
          ]
        },
        {
          "key": "child-17-18",
          "minEmpties": 17,
          "maxEmpties": 18,
          "features": [
            {
              "key": "mobility",
              "count": 500,
              "meanContribution": -114.99977143364445,
              "meanAbsContribution": 558.6780981633609,
              "maxAbsContribution": 2059.9470642284823,
              "absContributionShare": 0.1321549559792695
            },
            {
              "key": "corners",
              "count": 500,
              "meanContribution": 5.923926353244511,
              "meanAbsContribution": 47.23687361674088,
              "maxAbsContribution": 77.2686046075371,
              "absContributionShare": 0.0111738530182963
            },
            {
              "key": "cornerAdjacency",
              "count": 500,
              "meanContribution": 1.7250399915959795,
              "meanAbsContribution": 169.51476521128734,
              "maxAbsContribution": 292.3796595925388,
              "absContributionShare": 0.04009861207729559
            },
            {
              "key": "edgePattern",
              "count": 500,
              "meanContribution": 134.3453263780273,
              "meanAbsContribution": 1272.3182991540157,
              "maxAbsContribution": 8810.293783985822,
              "absContributionShare": 0.3009661008174189
            },
            {
              "key": "cornerPattern",
              "count": 500,
              "meanContribution": -47.77661641178792,
              "meanAbsContribution": 2095.6772130918175,
              "maxAbsContribution": 7073.72233281323,
              "absContributionShare": 0.4957311388318004
            },
            {
              "key": "discDifferential",
              "count": 500,
              "meanContribution": 23.118256350183753,
              "meanAbsContribution": 84.02194730225929,
              "maxAbsContribution": 311.617923985083,
              "absContributionShare": 0.01987533927592007
            },
            {
              "key": "parity",
              "count": 500,
              "meanContribution": 0,
              "meanAbsContribution": 0,
              "maxAbsContribution": 0,
              "absContributionShare": 0
            }
          ]
        }
      ]
    },
    "ablationAudit": {
      "overall": {
        "baseline": {
          "holdoutRoots": {
            "count": 250,
            "top1Accuracy": 0.48,
            "top3Accuracy": 0.816,
            "meanBestRank": 2.336,
            "meanRegret": 9883.708,
            "meanRegretInDiscs": 0.9883708000000001,
            "maxRegret": 160000,
            "maxRegretInDiscs": 16
          },
          "pairwise": {
            "comparablePairs": 6430,
            "correctPairs": 3787,
            "tiedTeacherPairs": 1652,
            "tiedPredictionPairs": 9,
            "accuracy": 0.5889580093312597,
            "weightedAccuracy": 0.6249619325261336,
            "maxTeacherGap": 480000
          }
        },
        "byFeature": [
          {
            "key": "mobility",
            "holdoutRoots": {
              "count": 250,
              "top1Accuracy": 0.432,
              "top3Accuracy": 0.736,
              "meanBestRank": 2.896,
              "meanRegret": 11913.628,
              "meanRegretInDiscs": 1.1913628,
              "maxRegret": 180000,
              "maxRegretInDiscs": 18
            },
            "pairwise": {
              "comparablePairs": 6430,
              "correctPairs": 3450,
              "tiedTeacherPairs": 1652,
              "tiedPredictionPairs": 52,
              "accuracy": 0.536547433903577,
              "weightedAccuracy": 0.5349580487618721,
              "maxTeacherGap": 480000
            },
            "deltas": {
              "top1Accuracy": -0.04799999999999999,
              "top3Accuracy": -0.07999999999999996,
              "meanRegret": 2029.92,
              "pairwiseAccuracy": -0.05241057542768279,
              "weightedPairwiseAccuracy": -0.0900038837642615
            }
          },
          {
            "key": "corners",
            "holdoutRoots": {
              "count": 250,
              "top1Accuracy": 0.468,
              "top3Accuracy": 0.816,
              "meanBestRank": 2.368,
              "meanRegret": 11269.648,
              "meanRegretInDiscs": 1.1269647999999999,
              "maxRegret": 200000,
              "maxRegretInDiscs": 20
            },
            "pairwise": {
              "comparablePairs": 6430,
              "correctPairs": 3785,
              "tiedTeacherPairs": 1652,
              "tiedPredictionPairs": 9,
              "accuracy": 0.588646967340591,
              "weightedAccuracy": 0.6240489844177116,
              "maxTeacherGap": 480000
            },
            "deltas": {
              "top1Accuracy": -0.011999999999999955,
              "top3Accuracy": 0,
              "meanRegret": 1385.9399999999987,
              "pairwiseAccuracy": -0.00031104199066878113,
              "weightedPairwiseAccuracy": -0.0009129481084220181
            }
          },
          {
            "key": "cornerAdjacency",
            "holdoutRoots": {
              "count": 250,
              "top1Accuracy": 0.464,
              "top3Accuracy": 0.788,
              "meanBestRank": 2.372,
              "meanRegret": 10950.024,
              "meanRegretInDiscs": 1.0950024,
              "maxRegret": 160000,
              "maxRegretInDiscs": 16
            },
            "pairwise": {
              "comparablePairs": 6430,
              "correctPairs": 3743,
              "tiedTeacherPairs": 1652,
              "tiedPredictionPairs": 9,
              "accuracy": 0.5821150855365474,
              "weightedAccuracy": 0.6106047659227586,
              "maxTeacherGap": 480000
            },
            "deltas": {
              "top1Accuracy": -0.01599999999999996,
              "top3Accuracy": -0.027999999999999914,
              "meanRegret": 1066.315999999999,
              "pairwiseAccuracy": -0.006842923794712297,
              "weightedPairwiseAccuracy": -0.014357166603375049
            }
          },
          {
            "key": "edgePattern",
            "holdoutRoots": {
              "count": 250,
              "top1Accuracy": 0.504,
              "top3Accuracy": 0.832,
              "meanBestRank": 2.204,
              "meanRegret": 9530.42,
              "meanRegretInDiscs": 0.9530420000000001,
              "maxRegret": 140000,
              "maxRegretInDiscs": 14
            },
            "pairwise": {
              "comparablePairs": 6430,
              "correctPairs": 3904,
              "tiedTeacherPairs": 1652,
              "tiedPredictionPairs": 16,
              "accuracy": 0.6071539657853811,
              "weightedAccuracy": 0.6411599702547047,
              "maxTeacherGap": 480000
            },
            "deltas": {
              "top1Accuracy": 0.02400000000000002,
              "top3Accuracy": 0.016000000000000014,
              "meanRegret": -353.28800000000047,
              "pairwiseAccuracy": 0.01819595645412131,
              "weightedPairwiseAccuracy": 0.01619803772857109
            }
          },
          {
            "key": "cornerPattern",
            "holdoutRoots": {
              "count": 250,
              "top1Accuracy": 0.388,
              "top3Accuracy": 0.788,
              "meanBestRank": 2.716,
              "meanRegret": 16027.644,
              "meanRegretInDiscs": 1.6027644,
              "maxRegret": 260000,
              "maxRegretInDiscs": 26
            },
            "pairwise": {
              "comparablePairs": 6430,
              "correctPairs": 3456,
              "tiedTeacherPairs": 1652,
              "tiedPredictionPairs": 33,
              "accuracy": 0.5374805598755832,
              "weightedAccuracy": 0.5443441742100714,
              "maxTeacherGap": 480000
            },
            "deltas": {
              "top1Accuracy": -0.09199999999999997,
              "top3Accuracy": -0.027999999999999914,
              "meanRegret": 6143.936,
              "pairwiseAccuracy": -0.05147744945567656,
              "weightedPairwiseAccuracy": -0.08061775831606222
            }
          },
          {
            "key": "discDifferential",
            "holdoutRoots": {
              "count": 250,
              "top1Accuracy": 0.484,
              "top3Accuracy": 0.828,
              "meanBestRank": 2.304,
              "meanRegret": 10550.552,
              "meanRegretInDiscs": 1.0550552,
              "maxRegret": 160000,
              "maxRegretInDiscs": 16
            },
            "pairwise": {
              "comparablePairs": 6430,
              "correctPairs": 3794,
              "tiedTeacherPairs": 1652,
              "tiedPredictionPairs": 27,
              "accuracy": 0.5900466562986003,
              "weightedAccuracy": 0.6216718658948612,
              "maxTeacherGap": 480000
            },
            "deltas": {
              "top1Accuracy": 0.0040000000000000036,
              "top3Accuracy": 0.01200000000000001,
              "meanRegret": 666.8439999999991,
              "pairwiseAccuracy": 0.0010886469673405674,
              "weightedPairwiseAccuracy": -0.0032900666312724036
            }
          },
          {
            "key": "parity",
            "holdoutRoots": {
              "count": 250,
              "top1Accuracy": 0.48,
              "top3Accuracy": 0.816,
              "meanBestRank": 2.336,
              "meanRegret": 9883.708,
              "meanRegretInDiscs": 0.9883708000000001,
              "maxRegret": 160000,
              "maxRegretInDiscs": 16
            },
            "pairwise": {
              "comparablePairs": 6430,
              "correctPairs": 3787,
              "tiedTeacherPairs": 1652,
              "tiedPredictionPairs": 9,
              "accuracy": 0.5889580093312597,
              "weightedAccuracy": 0.6249619325261336,
              "maxTeacherGap": 480000
            },
            "deltas": {
              "top1Accuracy": 0,
              "top3Accuracy": 0,
              "meanRegret": 0,
              "pairwiseAccuracy": 0,
              "weightedPairwiseAccuracy": 0
            }
          }
        ]
      },
      "byBucket": [
        {
          "key": "child-10-10",
          "minEmpties": 10,
          "maxEmpties": 10,
          "baseline": {
            "holdoutRoots": {
              "count": 45,
              "top1Accuracy": 0.5111111111111111,
              "top3Accuracy": 0.8666666666666667,
              "meanBestRank": 1.9777777777777779,
              "meanRegret": 24666.666666666668,
              "meanRegretInDiscs": 2.466666666666667,
              "maxRegret": 140000,
              "maxRegretInDiscs": 14
            },
            "pairwise": {
              "comparablePairs": 497,
              "correctPairs": 218,
              "tiedTeacherPairs": 359,
              "tiedPredictionPairs": 1,
              "accuracy": 0.4386317907444668,
              "weightedAccuracy": 0.49917898193760263,
              "maxTeacherGap": 330000
            }
          },
          "byFeature": [
            {
              "key": "mobility",
              "holdoutRoots": {
                "count": 45,
                "top1Accuracy": 0.5111111111111111,
                "top3Accuracy": 0.9111111111111111,
                "meanBestRank": 1.8444444444444446,
                "meanRegret": 26444.444444444445,
                "meanRegretInDiscs": 2.6444444444444444,
                "maxRegret": 140000,
                "maxRegretInDiscs": 14
              },
              "pairwise": {
                "comparablePairs": 497,
                "correctPairs": 237,
                "tiedTeacherPairs": 359,
                "tiedPredictionPairs": 2,
                "accuracy": 0.4768611670020121,
                "weightedAccuracy": 0.5238095238095238,
                "maxTeacherGap": 330000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0.0444444444444444,
                "meanRegret": 1777.7777777777774,
                "pairwiseAccuracy": 0.0382293762575453,
                "weightedPairwiseAccuracy": 0.024630541871921208
              }
            },
            {
              "key": "corners",
              "holdoutRoots": {
                "count": 45,
                "top1Accuracy": 0.4666666666666667,
                "top3Accuracy": 0.8444444444444444,
                "meanBestRank": 2.066666666666667,
                "meanRegret": 30444.444444444445,
                "meanRegretInDiscs": 3.0444444444444447,
                "maxRegret": 200000,
                "maxRegretInDiscs": 20
              },
              "pairwise": {
                "comparablePairs": 497,
                "correctPairs": 215,
                "tiedTeacherPairs": 359,
                "tiedPredictionPairs": 1,
                "accuracy": 0.43259557344064387,
                "weightedAccuracy": 0.48669950738916257,
                "maxTeacherGap": 330000
              },
              "deltas": {
                "top1Accuracy": -0.0444444444444444,
                "top3Accuracy": -0.022222222222222254,
                "meanRegret": 5777.777777777777,
                "pairwiseAccuracy": -0.006036217303822922,
                "weightedPairwiseAccuracy": -0.012479474548440062
              }
            },
            {
              "key": "cornerAdjacency",
              "holdoutRoots": {
                "count": 45,
                "top1Accuracy": 0.5111111111111111,
                "top3Accuracy": 0.8666666666666667,
                "meanBestRank": 1.9555555555555555,
                "meanRegret": 24222.222222222223,
                "meanRegretInDiscs": 2.422222222222222,
                "maxRegret": 140000,
                "maxRegretInDiscs": 14
              },
              "pairwise": {
                "comparablePairs": 497,
                "correctPairs": 222,
                "tiedTeacherPairs": 359,
                "tiedPredictionPairs": 1,
                "accuracy": 0.44668008048289737,
                "weightedAccuracy": 0.5165845648604269,
                "maxTeacherGap": 330000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": -444.44444444444525,
                "pairwiseAccuracy": 0.00804828973843058,
                "weightedPairwiseAccuracy": 0.017405582922824292
              }
            },
            {
              "key": "edgePattern",
              "holdoutRoots": {
                "count": 45,
                "top1Accuracy": 0.5333333333333333,
                "top3Accuracy": 0.8666666666666667,
                "meanBestRank": 1.9333333333333333,
                "meanRegret": 26000,
                "meanRegretInDiscs": 2.6,
                "maxRegret": 140000,
                "maxRegretInDiscs": 14
              },
              "pairwise": {
                "comparablePairs": 497,
                "correctPairs": 225,
                "tiedTeacherPairs": 359,
                "tiedPredictionPairs": 1,
                "accuracy": 0.45271629778672035,
                "weightedAccuracy": 0.5234811165845649,
                "maxTeacherGap": 330000
              },
              "deltas": {
                "top1Accuracy": 0.022222222222222254,
                "top3Accuracy": 0,
                "meanRegret": 1333.3333333333321,
                "pairwiseAccuracy": 0.014084507042253558,
                "weightedPairwiseAccuracy": 0.024302134646962237
              }
            },
            {
              "key": "cornerPattern",
              "holdoutRoots": {
                "count": 45,
                "top1Accuracy": 0.4444444444444444,
                "top3Accuracy": 0.8666666666666667,
                "meanBestRank": 2.0444444444444443,
                "meanRegret": 35111.11111111111,
                "meanRegretInDiscs": 3.511111111111111,
                "maxRegret": 200000,
                "maxRegretInDiscs": 20
              },
              "pairwise": {
                "comparablePairs": 497,
                "correctPairs": 210,
                "tiedTeacherPairs": 359,
                "tiedPredictionPairs": 3,
                "accuracy": 0.4225352112676056,
                "weightedAccuracy": 0.4827586206896552,
                "maxTeacherGap": 330000
              },
              "deltas": {
                "top1Accuracy": -0.06666666666666665,
                "top3Accuracy": 0,
                "meanRegret": 10444.444444444442,
                "pairwiseAccuracy": -0.01609657947686116,
                "weightedPairwiseAccuracy": -0.016420361247947435
              }
            },
            {
              "key": "discDifferential",
              "holdoutRoots": {
                "count": 45,
                "top1Accuracy": 0.5111111111111111,
                "top3Accuracy": 0.8666666666666667,
                "meanBestRank": 1.8888888888888888,
                "meanRegret": 28444.444444444445,
                "meanRegretInDiscs": 2.8444444444444446,
                "maxRegret": 140000,
                "maxRegretInDiscs": 14
              },
              "pairwise": {
                "comparablePairs": 497,
                "correctPairs": 221,
                "tiedTeacherPairs": 359,
                "tiedPredictionPairs": 2,
                "accuracy": 0.44466800804828976,
                "weightedAccuracy": 0.5008210180623974,
                "maxTeacherGap": 330000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 3777.7777777777774,
                "pairwiseAccuracy": 0.006036217303822977,
                "weightedPairwiseAccuracy": 0.001642036124794799
              }
            },
            {
              "key": "parity",
              "holdoutRoots": {
                "count": 45,
                "top1Accuracy": 0.5111111111111111,
                "top3Accuracy": 0.8666666666666667,
                "meanBestRank": 1.9777777777777779,
                "meanRegret": 24666.666666666668,
                "meanRegretInDiscs": 2.466666666666667,
                "maxRegret": 140000,
                "maxRegretInDiscs": 14
              },
              "pairwise": {
                "comparablePairs": 497,
                "correctPairs": 218,
                "tiedTeacherPairs": 359,
                "tiedPredictionPairs": 1,
                "accuracy": 0.4386317907444668,
                "weightedAccuracy": 0.49917898193760263,
                "maxTeacherGap": 330000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": 0,
                "weightedPairwiseAccuracy": 0
              }
            }
          ]
        },
        {
          "key": "child-11-12",
          "minEmpties": 11,
          "maxEmpties": 12,
          "baseline": {
            "holdoutRoots": {
              "count": 50,
              "top1Accuracy": 0.84,
              "top3Accuracy": 1,
              "meanBestRank": 1.22,
              "meanRegret": 11600,
              "meanRegretInDiscs": 1.16,
              "maxRegret": 160000,
              "maxRegretInDiscs": 16
            },
            "pairwise": {
              "comparablePairs": 532,
              "correctPairs": 302,
              "tiedTeacherPairs": 807,
              "tiedPredictionPairs": 1,
              "accuracy": 0.5676691729323309,
              "weightedAccuracy": 0.5754789272030651,
              "maxTeacherGap": 480000
            }
          },
          "byFeature": [
            {
              "key": "mobility",
              "holdoutRoots": {
                "count": 50,
                "top1Accuracy": 0.82,
                "top3Accuracy": 1,
                "meanBestRank": 1.22,
                "meanRegret": 12200,
                "meanRegretInDiscs": 1.22,
                "maxRegret": 180000,
                "maxRegretInDiscs": 18
              },
              "pairwise": {
                "comparablePairs": 532,
                "correctPairs": 296,
                "tiedTeacherPairs": 807,
                "tiedPredictionPairs": 3,
                "accuracy": 0.556390977443609,
                "weightedAccuracy": 0.5251596424010218,
                "maxTeacherGap": 480000
              },
              "deltas": {
                "top1Accuracy": -0.020000000000000018,
                "top3Accuracy": 0,
                "meanRegret": 600,
                "pairwiseAccuracy": -0.011278195488721887,
                "weightedPairwiseAccuracy": -0.050319284802043396
              }
            },
            {
              "key": "corners",
              "holdoutRoots": {
                "count": 50,
                "top1Accuracy": 0.84,
                "top3Accuracy": 1,
                "meanBestRank": 1.22,
                "meanRegret": 11600,
                "meanRegretInDiscs": 1.16,
                "maxRegret": 160000,
                "maxRegretInDiscs": 16
              },
              "pairwise": {
                "comparablePairs": 532,
                "correctPairs": 301,
                "tiedTeacherPairs": 807,
                "tiedPredictionPairs": 1,
                "accuracy": 0.5657894736842105,
                "weightedAccuracy": 0.5744572158365262,
                "maxTeacherGap": 480000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": -0.00187969924812037,
                "weightedPairwiseAccuracy": -0.0010217113665389466
              }
            },
            {
              "key": "cornerAdjacency",
              "holdoutRoots": {
                "count": 50,
                "top1Accuracy": 0.8,
                "top3Accuracy": 0.98,
                "meanBestRank": 1.3,
                "meanRegret": 14800,
                "meanRegretInDiscs": 1.48,
                "maxRegret": 160000,
                "maxRegretInDiscs": 16
              },
              "pairwise": {
                "comparablePairs": 532,
                "correctPairs": 313,
                "tiedTeacherPairs": 807,
                "tiedPredictionPairs": 1,
                "accuracy": 0.5883458646616542,
                "weightedAccuracy": 0.6010217113665389,
                "maxTeacherGap": 480000
              },
              "deltas": {
                "top1Accuracy": -0.039999999999999925,
                "top3Accuracy": -0.020000000000000018,
                "meanRegret": 3200,
                "pairwiseAccuracy": 0.020676691729323293,
                "weightedPairwiseAccuracy": 0.025542784163473775
              }
            },
            {
              "key": "edgePattern",
              "holdoutRoots": {
                "count": 50,
                "top1Accuracy": 0.88,
                "top3Accuracy": 0.98,
                "meanBestRank": 1.24,
                "meanRegret": 6800,
                "meanRegretInDiscs": 0.68,
                "maxRegret": 120000,
                "maxRegretInDiscs": 12
              },
              "pairwise": {
                "comparablePairs": 532,
                "correctPairs": 325,
                "tiedTeacherPairs": 807,
                "tiedPredictionPairs": 2,
                "accuracy": 0.6109022556390977,
                "weightedAccuracy": 0.59029374201788,
                "maxTeacherGap": 480000
              },
              "deltas": {
                "top1Accuracy": 0.040000000000000036,
                "top3Accuracy": -0.020000000000000018,
                "meanRegret": -4800,
                "pairwiseAccuracy": 0.043233082706766846,
                "weightedPairwiseAccuracy": 0.014814814814814836
              }
            },
            {
              "key": "cornerPattern",
              "holdoutRoots": {
                "count": 50,
                "top1Accuracy": 0.64,
                "top3Accuracy": 0.94,
                "meanBestRank": 1.6,
                "meanRegret": 26800,
                "meanRegretInDiscs": 2.68,
                "maxRegret": 260000,
                "maxRegretInDiscs": 26
              },
              "pairwise": {
                "comparablePairs": 532,
                "correctPairs": 211,
                "tiedTeacherPairs": 807,
                "tiedPredictionPairs": 3,
                "accuracy": 0.3966165413533835,
                "weightedAccuracy": 0.42171136653895275,
                "maxTeacherGap": 480000
              },
              "deltas": {
                "top1Accuracy": -0.19999999999999996,
                "top3Accuracy": -0.06000000000000005,
                "meanRegret": 15200,
                "pairwiseAccuracy": -0.1710526315789474,
                "weightedPairwiseAccuracy": -0.1537675606641124
              }
            },
            {
              "key": "discDifferential",
              "holdoutRoots": {
                "count": 50,
                "top1Accuracy": 0.84,
                "top3Accuracy": 1,
                "meanBestRank": 1.2,
                "meanRegret": 11600,
                "meanRegretInDiscs": 1.16,
                "maxRegret": 160000,
                "maxRegretInDiscs": 16
              },
              "pairwise": {
                "comparablePairs": 532,
                "correctPairs": 301,
                "tiedTeacherPairs": 807,
                "tiedPredictionPairs": 4,
                "accuracy": 0.5657894736842105,
                "weightedAccuracy": 0.5693486590038315,
                "maxTeacherGap": 480000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": -0.00187969924812037,
                "weightedPairwiseAccuracy": -0.006130268199233679
              }
            },
            {
              "key": "parity",
              "holdoutRoots": {
                "count": 50,
                "top1Accuracy": 0.84,
                "top3Accuracy": 1,
                "meanBestRank": 1.22,
                "meanRegret": 11600,
                "meanRegretInDiscs": 1.16,
                "maxRegret": 160000,
                "maxRegretInDiscs": 16
              },
              "pairwise": {
                "comparablePairs": 532,
                "correctPairs": 302,
                "tiedTeacherPairs": 807,
                "tiedPredictionPairs": 1,
                "accuracy": 0.5676691729323309,
                "weightedAccuracy": 0.5754789272030651,
                "maxTeacherGap": 480000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": 0,
                "weightedPairwiseAccuracy": 0
              }
            }
          ]
        },
        {
          "key": "child-13-14",
          "minEmpties": 13,
          "maxEmpties": 14,
          "baseline": {
            "holdoutRoots": {
              "count": 49,
              "top1Accuracy": 0.3673469387755102,
              "top3Accuracy": 0.7551020408163265,
              "meanBestRank": 2.857142857142857,
              "meanRegret": 9090.34693877551,
              "meanRegretInDiscs": 0.909034693877551,
              "maxRegret": 60000,
              "maxRegretInDiscs": 6
            },
            "pairwise": {
              "comparablePairs": 1299,
              "correctPairs": 751,
              "tiedTeacherPairs": 434,
              "tiedPredictionPairs": 2,
              "accuracy": 0.5781370284834488,
              "weightedAccuracy": 0.6823817125018644,
              "maxTeacherGap": 380000
            }
          },
          "byFeature": [
            {
              "key": "mobility",
              "holdoutRoots": {
                "count": 49,
                "top1Accuracy": 0.30612244897959184,
                "top3Accuracy": 0.5102040816326531,
                "meanBestRank": 4.36734693877551,
                "meanRegret": 13192.102040816326,
                "meanRegretInDiscs": 1.3192102040816325,
                "maxRegret": 140000,
                "maxRegretInDiscs": 14
              },
              "pairwise": {
                "comparablePairs": 1299,
                "correctPairs": 605,
                "tiedTeacherPairs": 434,
                "tiedPredictionPairs": 7,
                "accuracy": 0.4657428791377983,
                "weightedAccuracy": 0.44525070496142805,
                "maxTeacherGap": 380000
              },
              "deltas": {
                "top1Accuracy": -0.06122448979591838,
                "top3Accuracy": -0.2448979591836734,
                "meanRegret": 4101.7551020408155,
                "pairwiseAccuracy": -0.11239414934565051,
                "weightedPairwiseAccuracy": -0.23713100754043637
              }
            },
            {
              "key": "corners",
              "holdoutRoots": {
                "count": 49,
                "top1Accuracy": 0.3673469387755102,
                "top3Accuracy": 0.7755102040816326,
                "meanBestRank": 2.877551020408163,
                "meanRegret": 10314.836734693878,
                "meanRegretInDiscs": 1.0314836734693877,
                "maxRegret": 80000,
                "maxRegretInDiscs": 8
              },
              "pairwise": {
                "comparablePairs": 1299,
                "correctPairs": 751,
                "tiedTeacherPairs": 434,
                "tiedPredictionPairs": 2,
                "accuracy": 0.5781370284834488,
                "weightedAccuracy": 0.6905396639875263,
                "maxTeacherGap": 380000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0.020408163265306145,
                "meanRegret": 1224.4897959183672,
                "pairwiseAccuracy": 0,
                "weightedPairwiseAccuracy": 0.008157951485661896
              }
            },
            {
              "key": "cornerAdjacency",
              "holdoutRoots": {
                "count": 49,
                "top1Accuracy": 0.32653061224489793,
                "top3Accuracy": 0.6326530612244898,
                "meanBestRank": 2.8979591836734695,
                "meanRegret": 11673.591836734693,
                "meanRegretInDiscs": 1.1673591836734694,
                "maxRegret": 60000,
                "maxRegretInDiscs": 6
              },
              "pairwise": {
                "comparablePairs": 1299,
                "correctPairs": 706,
                "tiedTeacherPairs": 434,
                "tiedPredictionPairs": 2,
                "accuracy": 0.5434949961508853,
                "weightedAccuracy": 0.5842915378112589,
                "maxTeacherGap": 380000
              },
              "deltas": {
                "top1Accuracy": -0.04081632653061229,
                "top3Accuracy": -0.12244897959183665,
                "meanRegret": 2583.2448979591827,
                "pairwiseAccuracy": -0.03464203233256358,
                "weightedPairwiseAccuracy": -0.09809017469060555
              }
            },
            {
              "key": "edgePattern",
              "holdoutRoots": {
                "count": 49,
                "top1Accuracy": 0.3673469387755102,
                "top3Accuracy": 0.7551020408163265,
                "meanBestRank": 2.877551020408163,
                "meanRegret": 9090.34693877551,
                "meanRegretInDiscs": 0.909034693877551,
                "maxRegret": 60000,
                "maxRegretInDiscs": 6
              },
              "pairwise": {
                "comparablePairs": 1299,
                "correctPairs": 751,
                "tiedTeacherPairs": 434,
                "tiedPredictionPairs": 2,
                "accuracy": 0.5781370284834488,
                "weightedAccuracy": 0.6831621773853946,
                "maxTeacherGap": 380000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": 0,
                "weightedPairwiseAccuracy": 0.0007804648835302297
              }
            },
            {
              "key": "cornerPattern",
              "holdoutRoots": {
                "count": 49,
                "top1Accuracy": 0.3877551020408163,
                "top3Accuracy": 0.8163265306122449,
                "meanBestRank": 2.63265306122449,
                "meanRegret": 7928.7959183673465,
                "meanRegretInDiscs": 0.7928795918367346,
                "maxRegret": 60000,
                "maxRegretInDiscs": 6
              },
              "pairwise": {
                "comparablePairs": 1299,
                "correctPairs": 785,
                "tiedTeacherPairs": 434,
                "tiedPredictionPairs": 5,
                "accuracy": 0.6043110084680523,
                "weightedAccuracy": 0.7122539531621367,
                "maxTeacherGap": 380000
              },
              "deltas": {
                "top1Accuracy": 0.02040816326530609,
                "top3Accuracy": 0.061224489795918435,
                "meanRegret": -1161.5510204081638,
                "pairwiseAccuracy": 0.026173979984603468,
                "weightedPairwiseAccuracy": 0.029872240660272276
              }
            },
            {
              "key": "discDifferential",
              "holdoutRoots": {
                "count": 49,
                "top1Accuracy": 0.3673469387755102,
                "top3Accuracy": 0.7755102040816326,
                "meanBestRank": 2.816326530612245,
                "meanRegret": 9292.938775510203,
                "meanRegretInDiscs": 0.9292938775510203,
                "maxRegret": 60000,
                "maxRegretInDiscs": 6
              },
              "pairwise": {
                "comparablePairs": 1299,
                "correctPairs": 741,
                "tiedTeacherPairs": 434,
                "tiedPredictionPairs": 8,
                "accuracy": 0.5704387990762124,
                "weightedAccuracy": 0.6685425675407655,
                "maxTeacherGap": 380000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0.020408163265306145,
                "meanRegret": 202.59183673469306,
                "pairwiseAccuracy": -0.007698229407236412,
                "weightedPairwiseAccuracy": -0.013839144961098948
              }
            },
            {
              "key": "parity",
              "holdoutRoots": {
                "count": 49,
                "top1Accuracy": 0.3673469387755102,
                "top3Accuracy": 0.7551020408163265,
                "meanBestRank": 2.857142857142857,
                "meanRegret": 9090.34693877551,
                "meanRegretInDiscs": 0.909034693877551,
                "maxRegret": 60000,
                "maxRegretInDiscs": 6
              },
              "pairwise": {
                "comparablePairs": 1299,
                "correctPairs": 751,
                "tiedTeacherPairs": 434,
                "tiedPredictionPairs": 2,
                "accuracy": 0.5781370284834488,
                "weightedAccuracy": 0.6823817125018644,
                "maxTeacherGap": 380000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": 0,
                "weightedPairwiseAccuracy": 0
              }
            }
          ]
        },
        {
          "key": "child-15-16",
          "minEmpties": 15,
          "maxEmpties": 16,
          "baseline": {
            "holdoutRoots": {
              "count": 52,
              "top1Accuracy": 0.40384615384615385,
              "top3Accuracy": 0.6923076923076923,
              "meanBestRank": 2.6346153846153846,
              "meanRegret": 2339.6923076923076,
              "meanRegretInDiscs": 0.23396923076923076,
              "maxRegret": 45758,
              "maxRegretInDiscs": 4.5758
            },
            "pairwise": {
              "comparablePairs": 1858,
              "correctPairs": 1201,
              "tiedTeacherPairs": 24,
              "tiedPredictionPairs": 2,
              "accuracy": 0.6463939720129172,
              "weightedAccuracy": 0.7706392458525884,
              "maxTeacherGap": 94096
            }
          },
          "byFeature": [
            {
              "key": "mobility",
              "holdoutRoots": {
                "count": 52,
                "top1Accuracy": 0.28846153846153844,
                "top3Accuracy": 0.5961538461538461,
                "meanBestRank": 3.5961538461538463,
                "meanRegret": 5549.134615384615,
                "meanRegretInDiscs": 0.5549134615384615,
                "maxRegret": 64133,
                "maxRegretInDiscs": 6.4133
              },
              "pairwise": {
                "comparablePairs": 1858,
                "correctPairs": 1061,
                "tiedTeacherPairs": 24,
                "tiedPredictionPairs": 10,
                "accuracy": 0.5710441334768568,
                "weightedAccuracy": 0.6246391134378981,
                "maxTeacherGap": 94096
              },
              "deltas": {
                "top1Accuracy": -0.11538461538461542,
                "top3Accuracy": -0.09615384615384615,
                "meanRegret": 3209.4423076923076,
                "pairwiseAccuracy": -0.07534983853606037,
                "weightedPairwiseAccuracy": -0.14600013241469023
              }
            },
            {
              "key": "corners",
              "holdoutRoots": {
                "count": 52,
                "top1Accuracy": 0.38461538461538464,
                "top3Accuracy": 0.6923076923076923,
                "meanBestRank": 2.6923076923076925,
                "meanRegret": 2849.019230769231,
                "meanRegretInDiscs": 0.2849019230769231,
                "maxRegret": 45758,
                "maxRegretInDiscs": 4.5758
              },
              "pairwise": {
                "comparablePairs": 1858,
                "correctPairs": 1204,
                "tiedTeacherPairs": 24,
                "tiedPredictionPairs": 2,
                "accuracy": 0.6480086114101185,
                "weightedAccuracy": 0.7722341644940683,
                "maxTeacherGap": 94096
              },
              "deltas": {
                "top1Accuracy": -0.019230769230769218,
                "top3Accuracy": 0,
                "meanRegret": 509.3269230769233,
                "pairwiseAccuracy": 0.0016146393972013007,
                "weightedPairwiseAccuracy": 0.001594918641479981
              }
            },
            {
              "key": "cornerAdjacency",
              "holdoutRoots": {
                "count": 52,
                "top1Accuracy": 0.40384615384615385,
                "top3Accuracy": 0.6923076923076923,
                "meanBestRank": 2.6923076923076925,
                "meanRegret": 2339.6923076923076,
                "meanRegretInDiscs": 0.23396923076923076,
                "maxRegret": 45758,
                "maxRegretInDiscs": 4.5758
              },
              "pairwise": {
                "comparablePairs": 1858,
                "correctPairs": 1195,
                "tiedTeacherPairs": 24,
                "tiedPredictionPairs": 2,
                "accuracy": 0.6431646932185145,
                "weightedAccuracy": 0.7654363161328684,
                "maxTeacherGap": 94096
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": -0.0032292787944026013,
                "weightedPairwiseAccuracy": -0.005202929719719918
              }
            },
            {
              "key": "edgePattern",
              "holdoutRoots": {
                "count": 52,
                "top1Accuracy": 0.36538461538461536,
                "top3Accuracy": 0.7115384615384616,
                "meanBestRank": 2.6538461538461537,
                "meanRegret": 4268.2307692307695,
                "meanRegretInDiscs": 0.42682307692307697,
                "maxRegret": 66066,
                "maxRegretInDiscs": 6.6066
              },
              "pairwise": {
                "comparablePairs": 1858,
                "correctPairs": 1213,
                "tiedTeacherPairs": 24,
                "tiedPredictionPairs": 5,
                "accuracy": 0.6528525296017222,
                "weightedAccuracy": 0.7792649743634538,
                "maxTeacherGap": 94096
              },
              "deltas": {
                "top1Accuracy": -0.03846153846153849,
                "top3Accuracy": 0.019230769230769273,
                "meanRegret": 1928.538461538462,
                "pairwiseAccuracy": 0.006458557588805092,
                "weightedPairwiseAccuracy": 0.008625728510865405
              }
            },
            {
              "key": "cornerPattern",
              "holdoutRoots": {
                "count": 52,
                "top1Accuracy": 0.3269230769230769,
                "top3Accuracy": 0.6923076923076923,
                "meanBestRank": 3.3653846153846154,
                "meanRegret": 6643.134615384615,
                "meanRegretInDiscs": 0.6643134615384615,
                "maxRegret": 76252,
                "maxRegretInDiscs": 7.6252
              },
              "pairwise": {
                "comparablePairs": 1858,
                "correctPairs": 1051,
                "tiedTeacherPairs": 24,
                "tiedPredictionPairs": 6,
                "accuracy": 0.5656620021528526,
                "weightedAccuracy": 0.5969337322321494,
                "maxTeacherGap": 94096
              },
              "deltas": {
                "top1Accuracy": -0.07692307692307693,
                "top3Accuracy": 0,
                "meanRegret": 4303.442307692308,
                "pairwiseAccuracy": -0.08073196986006459,
                "weightedPairwiseAccuracy": -0.17370551362043896
              }
            },
            {
              "key": "discDifferential",
              "holdoutRoots": {
                "count": 52,
                "top1Accuracy": 0.40384615384615385,
                "top3Accuracy": 0.7115384615384616,
                "meanBestRank": 2.6538461538461537,
                "meanRegret": 2255.153846153846,
                "meanRegretInDiscs": 0.22551538461538462,
                "maxRegret": 45758,
                "maxRegretInDiscs": 4.5758
              },
              "pairwise": {
                "comparablePairs": 1858,
                "correctPairs": 1220,
                "tiedTeacherPairs": 24,
                "tiedPredictionPairs": 8,
                "accuracy": 0.6566200215285253,
                "weightedAccuracy": 0.7829467127632459,
                "maxTeacherGap": 94096
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0.019230769230769273,
                "meanRegret": -84.53846153846143,
                "pairwiseAccuracy": 0.010226049515608127,
                "weightedPairwiseAccuracy": 0.012307466910657539
              }
            },
            {
              "key": "parity",
              "holdoutRoots": {
                "count": 52,
                "top1Accuracy": 0.40384615384615385,
                "top3Accuracy": 0.6923076923076923,
                "meanBestRank": 2.6346153846153846,
                "meanRegret": 2339.6923076923076,
                "meanRegretInDiscs": 0.23396923076923076,
                "maxRegret": 45758,
                "maxRegretInDiscs": 4.5758
              },
              "pairwise": {
                "comparablePairs": 1858,
                "correctPairs": 1201,
                "tiedTeacherPairs": 24,
                "tiedPredictionPairs": 2,
                "accuracy": 0.6463939720129172,
                "weightedAccuracy": 0.7706392458525884,
                "maxTeacherGap": 94096
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": 0,
                "weightedPairwiseAccuracy": 0
              }
            }
          ]
        },
        {
          "key": "child-17-18",
          "minEmpties": 17,
          "maxEmpties": 18,
          "baseline": {
            "holdoutRoots": {
              "count": 54,
              "top1Accuracy": 0.2962962962962963,
              "top3Accuracy": 0.7777777777777778,
              "meanBestRank": 2.9074074074074074,
              "meanRegret": 3959.925925925926,
              "meanRegretInDiscs": 0.3959925925925926,
              "maxRegret": 27573,
              "maxRegretInDiscs": 2.7573
            },
            "pairwise": {
              "comparablePairs": 2244,
              "correctPairs": 1315,
              "tiedTeacherPairs": 28,
              "tiedPredictionPairs": 3,
              "accuracy": 0.5860071301247772,
              "weightedAccuracy": 0.6847707260009455,
              "maxTeacherGap": 73876
            }
          },
          "byFeature": [
            {
              "key": "mobility",
              "holdoutRoots": {
                "count": 54,
                "top1Accuracy": 0.25925925925925924,
                "top3Accuracy": 0.6851851851851852,
                "meanBestRank": 3.314814814814815,
                "meanRegret": 4508.12962962963,
                "meanRegretInDiscs": 0.45081296296296297,
                "maxRegret": 27573,
                "maxRegretInDiscs": 2.7573
              },
              "pairwise": {
                "comparablePairs": 2244,
                "correctPairs": 1251,
                "tiedTeacherPairs": 28,
                "tiedPredictionPairs": 30,
                "accuracy": 0.5574866310160428,
                "weightedAccuracy": 0.639165912168388,
                "maxTeacherGap": 73876
              },
              "deltas": {
                "top1Accuracy": -0.037037037037037035,
                "top3Accuracy": -0.09259259259259256,
                "meanRegret": 548.2037037037035,
                "pairwiseAccuracy": -0.028520499108734443,
                "weightedPairwiseAccuracy": -0.045604813832557434
              }
            },
            {
              "key": "corners",
              "holdoutRoots": {
                "count": 54,
                "top1Accuracy": 0.2962962962962963,
                "top3Accuracy": 0.7777777777777778,
                "meanBestRank": 2.9074074074074074,
                "meanRegret": 3959.925925925926,
                "meanRegretInDiscs": 0.3959925925925926,
                "maxRegret": 27573,
                "maxRegretInDiscs": 2.7573
              },
              "pairwise": {
                "comparablePairs": 2244,
                "correctPairs": 1314,
                "tiedTeacherPairs": 28,
                "tiedPredictionPairs": 3,
                "accuracy": 0.5855614973262032,
                "weightedAccuracy": 0.68450818730787,
                "maxTeacherGap": 73876
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": -0.00044563279857401383,
                "weightedPairwiseAccuracy": -0.00026253869307546474
              }
            },
            {
              "key": "cornerAdjacency",
              "holdoutRoots": {
                "count": 54,
                "top1Accuracy": 0.2962962962962963,
                "top3Accuracy": 0.7777777777777778,
                "meanBestRank": 2.925925925925926,
                "meanRegret": 3959.925925925926,
                "meanRegretInDiscs": 0.3959925925925926,
                "maxRegret": 27573,
                "maxRegretInDiscs": 2.7573
              },
              "pairwise": {
                "comparablePairs": 2244,
                "correctPairs": 1307,
                "tiedTeacherPairs": 28,
                "tiedPredictionPairs": 3,
                "accuracy": 0.5824420677361853,
                "weightedAccuracy": 0.6722562569941323,
                "maxTeacherGap": 73876
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": -0.0035650623885918886,
                "weightedPairwiseAccuracy": -0.01251446900681319
              }
            },
            {
              "key": "edgePattern",
              "holdoutRoots": {
                "count": 54,
                "top1Accuracy": 0.3888888888888889,
                "top3Accuracy": 0.8518518518518519,
                "meanBestRank": 2.2777777777777777,
                "meanRegret": 3800.5555555555557,
                "meanRegretInDiscs": 0.3800555555555556,
                "maxRegret": 40425,
                "maxRegretInDiscs": 4.0425
              },
              "pairwise": {
                "comparablePairs": 2244,
                "correctPairs": 1390,
                "tiedTeacherPairs": 28,
                "tiedPredictionPairs": 6,
                "accuracy": 0.6194295900178253,
                "weightedAccuracy": 0.7252991151671514,
                "maxTeacherGap": 73876
              },
              "deltas": {
                "top1Accuracy": 0.09259259259259262,
                "top3Accuracy": 0.07407407407407407,
                "meanRegret": -159.37037037037044,
                "pairwiseAccuracy": 0.03342245989304804,
                "weightedPairwiseAccuracy": 0.040528389166205936
              }
            },
            {
              "key": "cornerPattern",
              "holdoutRoots": {
                "count": 54,
                "top1Accuracy": 0.16666666666666666,
                "top3Accuracy": 0.6481481481481481,
                "meanBestRank": 3.759259259259259,
                "meanRegret": 6536.240740740741,
                "meanRegretInDiscs": 0.6536240740740741,
                "maxRegret": 52847,
                "maxRegretInDiscs": 5.2847
              },
              "pairwise": {
                "comparablePairs": 2244,
                "correctPairs": 1199,
                "tiedTeacherPairs": 28,
                "tiedPredictionPairs": 16,
                "accuracy": 0.5343137254901961,
                "weightedAccuracy": 0.5542866986627353,
                "maxTeacherGap": 73876
              },
              "deltas": {
                "top1Accuracy": -0.12962962962962962,
                "top3Accuracy": -0.12962962962962965,
                "meanRegret": 2576.314814814815,
                "pairwiseAccuracy": -0.051693404634581164,
                "weightedPairwiseAccuracy": -0.13048402733821018
              }
            },
            {
              "key": "discDifferential",
              "holdoutRoots": {
                "count": 54,
                "top1Accuracy": 0.3148148148148148,
                "top3Accuracy": 0.7962962962962963,
                "meanBestRank": 2.8703703703703702,
                "meanRegret": 3796.5925925925926,
                "meanRegretInDiscs": 0.37965925925925925,
                "maxRegret": 27573,
                "maxRegretInDiscs": 2.7573
              },
              "pairwise": {
                "comparablePairs": 2244,
                "correctPairs": 1311,
                "tiedTeacherPairs": 28,
                "tiedPredictionPairs": 5,
                "accuracy": 0.5842245989304813,
                "weightedAccuracy": 0.6819792159093641,
                "maxTeacherGap": 73876
              },
              "deltas": {
                "top1Accuracy": 0.018518518518518545,
                "top3Accuracy": 0.01851851851851849,
                "meanRegret": -163.33333333333348,
                "pairwiseAccuracy": -0.0017825311942959443,
                "weightedPairwiseAccuracy": -0.002791510091581406
              }
            },
            {
              "key": "parity",
              "holdoutRoots": {
                "count": 54,
                "top1Accuracy": 0.2962962962962963,
                "top3Accuracy": 0.7777777777777778,
                "meanBestRank": 2.9074074074074074,
                "meanRegret": 3959.925925925926,
                "meanRegretInDiscs": 0.3959925925925926,
                "maxRegret": 27573,
                "maxRegretInDiscs": 2.7573
              },
              "pairwise": {
                "comparablePairs": 2244,
                "correctPairs": 1315,
                "tiedTeacherPairs": 28,
                "tiedPredictionPairs": 3,
                "accuracy": 0.5860071301247772,
                "weightedAccuracy": 0.6847707260009455,
                "maxTeacherGap": 73876
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": 0,
                "weightedPairwiseAccuracy": 0
              }
            }
          ]
        }
      ]
    },
    "omittedFeatureResidualCorrelation": {
      "overall": [
        {
          "key": "flipCount",
          "count": 2031,
          "correlation": 0.12488288776301569,
          "meanAbsFeature": 2.879862136878385
        },
        {
          "key": "passFlag",
          "count": 2031,
          "correlation": -0.08277976964621274,
          "meanAbsFeature": 0.002461841457410143
        },
        {
          "key": "riskCSquare",
          "count": 2031,
          "correlation": 0.07640253965250322,
          "meanAbsFeature": 0.22451994091580502
        },
        {
          "key": "opponentCornerReplies",
          "count": 2031,
          "correlation": 0.044544446248423276,
          "meanAbsFeature": 0.6794682422451994
        },
        {
          "key": "opponentMoveCountRaw",
          "count": 2031,
          "correlation": -0.017158155800912223,
          "meanAbsFeature": 7.794190054160512
        },
        {
          "key": "myMoveCountRaw",
          "count": 2031,
          "correlation": -0.0163196933248015,
          "meanAbsFeature": 7.75972427375677
        },
        {
          "key": "riskXSquare",
          "count": 2031,
          "correlation": 0.008843657460839654,
          "meanAbsFeature": 0.07680945347119646
        }
      ],
      "byBucket": [
        {
          "key": "child-10-10",
          "minEmpties": 10,
          "maxEmpties": 10,
          "correlations": [
            {
              "key": "riskXSquare",
              "count": 285,
              "correlation": -0.13212697162278572,
              "meanAbsFeature": 0.0912280701754386
            },
            {
              "key": "riskCSquare",
              "count": 285,
              "correlation": 0.1302584296246836,
              "meanAbsFeature": 0.2736842105263158
            },
            {
              "key": "opponentMoveCountRaw",
              "count": 285,
              "correlation": -0.11338847302776327,
              "meanAbsFeature": 5.992982456140351
            },
            {
              "key": "passFlag",
              "count": 285,
              "correlation": -0.10511624905508792,
              "meanAbsFeature": 0.007017543859649123
            },
            {
              "key": "flipCount",
              "count": 285,
              "correlation": 0.03353206785033286,
              "meanAbsFeature": 3.0210526315789474
            },
            {
              "key": "opponentCornerReplies",
              "count": 285,
              "correlation": 0.013206676695506974,
              "meanAbsFeature": 0.7263157894736842
            },
            {
              "key": "myMoveCountRaw",
              "count": 285,
              "correlation": -0.010903811446274928,
              "meanAbsFeature": 5.628070175438596
            }
          ]
        },
        {
          "key": "child-11-12",
          "minEmpties": 11,
          "maxEmpties": 12,
          "correlations": [
            {
              "key": "flipCount",
              "count": 377,
              "correlation": 0.16743062479344034,
              "meanAbsFeature": 3.042440318302387
            },
            {
              "key": "opponentMoveCountRaw",
              "count": 377,
              "correlation": -0.05518311449312696,
              "meanAbsFeature": 6.83289124668435
            },
            {
              "key": "passFlag",
              "count": 377,
              "correlation": -0.045106875830737095,
              "meanAbsFeature": 0.002652519893899204
            },
            {
              "key": "myMoveCountRaw",
              "count": 377,
              "correlation": -0.04006036645651704,
              "meanAbsFeature": 6.907161803713528
            },
            {
              "key": "riskXSquare",
              "count": 377,
              "correlation": 0.03622676152372545,
              "meanAbsFeature": 0.07427055702917772
            },
            {
              "key": "riskCSquare",
              "count": 377,
              "correlation": 0.033697043505509484,
              "meanAbsFeature": 0.2413793103448276
            },
            {
              "key": "opponentCornerReplies",
              "count": 377,
              "correlation": 0.011168989922398863,
              "meanAbsFeature": 0.6631299734748011
            }
          ]
        },
        {
          "key": "child-13-14",
          "minEmpties": 13,
          "maxEmpties": 14,
          "correlations": [
            {
              "key": "flipCount",
              "count": 418,
              "correlation": 0.17902339284359883,
              "meanAbsFeature": 3.035885167464115
            },
            {
              "key": "opponentCornerReplies",
              "count": 418,
              "correlation": 0.1519989436844793,
              "meanAbsFeature": 0.6961722488038278
            },
            {
              "key": "riskXSquare",
              "count": 418,
              "correlation": 0.14410825496027194,
              "meanAbsFeature": 0.07655502392344497
            },
            {
              "key": "myMoveCountRaw",
              "count": 418,
              "correlation": -0.06839310219067549,
              "meanAbsFeature": 7.988038277511961
            },
            {
              "key": "riskCSquare",
              "count": 418,
              "correlation": 0.05512687225159477,
              "meanAbsFeature": 0.21291866028708134
            },
            {
              "key": "opponentMoveCountRaw",
              "count": 418,
              "correlation": 0.03918967862880289,
              "meanAbsFeature": 7.258373205741627
            },
            {
              "key": "passFlag",
              "count": 418,
              "correlation": null,
              "meanAbsFeature": 0
            }
          ]
        },
        {
          "key": "child-15-16",
          "minEmpties": 15,
          "maxEmpties": 16,
          "correlations": [
            {
              "key": "passFlag",
              "count": 451,
              "correlation": -0.27844589584159896,
              "meanAbsFeature": 0.004434589800443459
            },
            {
              "key": "flipCount",
              "count": 451,
              "correlation": 0.22963511382807023,
              "meanAbsFeature": 2.731707317073171
            },
            {
              "key": "riskCSquare",
              "count": 451,
              "correlation": 0.14378625549374283,
              "meanAbsFeature": 0.19955654101995565
            },
            {
              "key": "opponentCornerReplies",
              "count": 451,
              "correlation": 0.06976942079475983,
              "meanAbsFeature": 0.6385809312638581
            },
            {
              "key": "opponentMoveCountRaw",
              "count": 451,
              "correlation": 0.04501573833921534,
              "meanAbsFeature": 8.288248337028826
            },
            {
              "key": "riskXSquare",
              "count": 451,
              "correlation": 0.006190359527801371,
              "meanAbsFeature": 0.082039911308204
            },
            {
              "key": "myMoveCountRaw",
              "count": 451,
              "correlation": -0.0003556569196480277,
              "meanAbsFeature": 8.286031042128602
            }
          ]
        },
        {
          "key": "child-17-18",
          "minEmpties": 17,
          "maxEmpties": 18,
          "correlations": [
            {
              "key": "riskCSquare",
              "count": 500,
              "correlation": 0.21495123264457172,
              "meanAbsFeature": 0.216
            },
            {
              "key": "flipCount",
              "count": 500,
              "correlation": 0.1540735749419955,
              "meanAbsFeature": 2.68
            },
            {
              "key": "opponentCornerReplies",
              "count": 500,
              "correlation": 0.062362822030394935,
              "meanAbsFeature": 0.688
            },
            {
              "key": "myMoveCountRaw",
              "count": 500,
              "correlation": 0.06058547915035916,
              "meanAbsFeature": 8.952
            },
            {
              "key": "riskXSquare",
              "count": 500,
              "correlation": -0.03591193877422801,
              "meanAbsFeature": 0.066
            },
            {
              "key": "opponentMoveCountRaw",
              "count": 500,
              "correlation": 0.007544498770713117,
              "meanAbsFeature": 9.548
            },
            {
              "key": "passFlag",
              "count": 500,
              "correlation": null,
              "meanAbsFeature": 0
            }
          ]
        }
      ]
    },
    "byBucket": [
      {
        "key": "child-10-10",
        "minEmpties": 10,
        "maxEmpties": 10,
        "holdoutMoves": {
          "targetMode": "root-mean",
          "count": 285,
          "mae": 26618.481694474896,
          "rmse": 39653.493189158144,
          "meanResidual": -575.9333426048782,
          "stdDevResidual": 39649.31049699966,
          "maxAbsResidual": 259582.96132409517,
          "maeInDiscs": 2.66184816944749,
          "rmseInDiscs": 3.9653493189158144
        },
        "holdoutMovesRawAligned": {
          "alignment": "per-root-mean",
          "count": 285,
          "mae": 26238.48728092483,
          "rmse": 39517.012018802736,
          "meanResidual": 1.0722463852480837e-12,
          "stdDevResidual": 39517.012018802736,
          "maxAbsResidual": 252485.02854196436,
          "maeInDiscs": 2.623848728092483,
          "rmseInDiscs": 3.9517012018802737
        },
        "holdoutRoots": {
          "count": 45,
          "top1Accuracy": 0.5111111111111111,
          "top3Accuracy": 0.8666666666666667,
          "meanBestRank": 1.9777777777777779,
          "meanRegret": 24666.666666666668,
          "meanRegretInDiscs": 2.466666666666667,
          "maxRegret": 140000,
          "maxRegretInDiscs": 14
        },
        "holdoutPairwise": {
          "comparablePairs": 497,
          "correctPairs": 218,
          "tiedTeacherPairs": 359,
          "tiedPredictionPairs": 1,
          "accuracy": 0.4386317907444668,
          "weightedAccuracy": 0.49917898193760263,
          "maxTeacherGap": 330000
        }
      },
      {
        "key": "child-11-12",
        "minEmpties": 11,
        "maxEmpties": 12,
        "holdoutMoves": {
          "targetMode": "root-mean",
          "count": 377,
          "mae": 24717.32326937866,
          "rmse": 46148.293902840494,
          "meanResidual": -102.38843713244351,
          "stdDevResidual": 46148.180318956096,
          "maxAbsResidual": 381621.4263288247,
          "maeInDiscs": 2.471732326937866,
          "rmseInDiscs": 4.61482939028405
        },
        "holdoutMovesRawAligned": {
          "alignment": "per-root-mean",
          "count": 377,
          "mae": 24258.02184188364,
          "rmse": 45962.12262381515,
          "meanResidual": -1.7755652533285814e-12,
          "stdDevResidual": 45962.12262381515,
          "maxAbsResidual": 378412.43692501046,
          "maeInDiscs": 2.425802184188364,
          "rmseInDiscs": 4.596212262381515
        },
        "holdoutRoots": {
          "count": 50,
          "top1Accuracy": 0.84,
          "top3Accuracy": 1,
          "meanBestRank": 1.22,
          "meanRegret": 11600,
          "meanRegretInDiscs": 1.16,
          "maxRegret": 160000,
          "maxRegretInDiscs": 16
        },
        "holdoutPairwise": {
          "comparablePairs": 532,
          "correctPairs": 302,
          "tiedTeacherPairs": 807,
          "tiedPredictionPairs": 1,
          "accuracy": 0.5676691729323309,
          "weightedAccuracy": 0.5754789272030651,
          "maxTeacherGap": 480000
        }
      },
      {
        "key": "child-13-14",
        "minEmpties": 13,
        "maxEmpties": 14,
        "holdoutMoves": {
          "targetMode": "root-mean",
          "count": 418,
          "mae": 12718.897884182674,
          "rmse": 27114.05827699951,
          "meanResidual": 209.2074900451743,
          "stdDevResidual": 27113.251160173222,
          "maxAbsResidual": 312080.71010956564,
          "maeInDiscs": 1.2718897884182674,
          "rmseInDiscs": 2.711405827699951
        },
        "holdoutMovesRawAligned": {
          "alignment": "per-root-mean",
          "count": 418,
          "mae": 12619.040542700872,
          "rmse": 27061.085215582334,
          "meanResidual": 1.0095826354608582e-12,
          "stdDevResidual": 27061.085215582334,
          "maxAbsResidual": 310658.8963538561,
          "maeInDiscs": 1.2619040542700872,
          "rmseInDiscs": 2.7061085215582334
        },
        "holdoutRoots": {
          "count": 49,
          "top1Accuracy": 0.3673469387755102,
          "top3Accuracy": 0.7551020408163265,
          "meanBestRank": 2.857142857142857,
          "meanRegret": 9090.34693877551,
          "meanRegretInDiscs": 0.909034693877551,
          "maxRegret": 60000,
          "maxRegretInDiscs": 6
        },
        "holdoutPairwise": {
          "comparablePairs": 1299,
          "correctPairs": 751,
          "tiedTeacherPairs": 434,
          "tiedPredictionPairs": 2,
          "accuracy": 0.5781370284834488,
          "weightedAccuracy": 0.6823817125018644,
          "maxTeacherGap": 380000
        }
      },
      {
        "key": "child-15-16",
        "minEmpties": 15,
        "maxEmpties": 16,
        "holdoutMoves": {
          "targetMode": "root-mean",
          "count": 451,
          "mae": 6839.011900149005,
          "rmse": 11731.022688209081,
          "meanResidual": 159.1254680701569,
          "stdDevResidual": 11729.94340978198,
          "maxAbsResidual": 63846.13668503804,
          "maeInDiscs": 0.6839011900149005,
          "rmseInDiscs": 1.173102268820908
        },
        "holdoutMovesRawAligned": {
          "alignment": "per-root-mean",
          "count": 451,
          "mae": 6608.153095313383,
          "rmse": 11578.121674615737,
          "meanResidual": -3.7105770537964254e-13,
          "stdDevResidual": 11578.121674615737,
          "maxAbsResidual": 60904.93867376432,
          "maeInDiscs": 0.6608153095313384,
          "rmseInDiscs": 1.1578121674615738
        },
        "holdoutRoots": {
          "count": 52,
          "top1Accuracy": 0.40384615384615385,
          "top3Accuracy": 0.6923076923076923,
          "meanBestRank": 2.6346153846153846,
          "meanRegret": 2339.6923076923076,
          "meanRegretInDiscs": 0.23396923076923076,
          "maxRegret": 45758,
          "maxRegretInDiscs": 4.5758
        },
        "holdoutPairwise": {
          "comparablePairs": 1858,
          "correctPairs": 1201,
          "tiedTeacherPairs": 24,
          "tiedPredictionPairs": 2,
          "accuracy": 0.6463939720129172,
          "weightedAccuracy": 0.7706392458525884,
          "maxTeacherGap": 94096
        }
      },
      {
        "key": "child-17-18",
        "minEmpties": 17,
        "maxEmpties": 18,
        "holdoutMoves": {
          "targetMode": "root-mean",
          "count": 500,
          "mae": 5765.780579923171,
          "rmse": 8953.529495702734,
          "meanResidual": 2.3361612276188217,
          "stdDevResidual": 8953.529190926312,
          "maxAbsResidual": 60122.23379380054,
          "maeInDiscs": 0.5765780579923171,
          "rmseInDiscs": 0.8953529495702734
        },
        "holdoutMovesRawAligned": {
          "alignment": "per-root-mean",
          "count": 500,
          "mae": 5589.301668728477,
          "rmse": 8763.45713827135,
          "meanResidual": -7.275957614183426e-13,
          "stdDevResidual": 8763.45713827135,
          "maxAbsResidual": 59348.99720033431,
          "maeInDiscs": 0.5589301668728477,
          "rmseInDiscs": 0.8763457138271349
        },
        "holdoutRoots": {
          "count": 54,
          "top1Accuracy": 0.2962962962962963,
          "top3Accuracy": 0.7777777777777778,
          "meanBestRank": 2.9074074074074074,
          "meanRegret": 3959.925925925926,
          "meanRegretInDiscs": 0.3959925925925926,
          "maxRegret": 27573,
          "maxRegretInDiscs": 2.7573
        },
        "holdoutPairwise": {
          "comparablePairs": 2244,
          "correctPairs": 1315,
          "tiedTeacherPairs": 28,
          "tiedPredictionPairs": 3,
          "accuracy": 0.5860071301247772,
          "weightedAccuracy": 0.6847707260009455,
          "maxTeacherGap": 73876
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
      "holdoutResidue": 0,
      "targetMode": "root-mean",
      "rootWeighting": "uniform",
      "exactRootWeightScale": 1,
      "excludedFeatureKeys": []
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
    "createdAt": "2026-03-28T06:46:42.296Z",
    "adoptedFromProfilePath": "tools/evaluator-training/out/stage44_candidateH2_edgePattern125_cornerPattern125_11_12.json",
    "candidateAlias": "candidateH2",
    "selectedFromTuningSummaryPath": "benchmarks/stage43_top_pair_search_decision_summary_20260330.json",
    "priorActiveProfileBackupPath": "tools/evaluator-training/out/stage44_candidateF_before_candidateH2.json",
    "activeAdoption": {
      "candidateAlias": "candidateH2",
      "adoptedAt": "2026-03-30T16:54:58+09:00",
      "priorActiveProfileName": "stage41-candidateF-cornerPattern125-11-12",
      "priorActiveProfileBackupPath": "tools/evaluator-training/out/stage44_candidateF_before_candidateH2.json",
      "selectedFromBenchmarkSummaryPath": "benchmarks/stage44_candidateH2_current_apples_to_apples_24seed_20260330.json"
    },
    "localSearch": {
      "baseProfileName": "stage41-candidateF-cornerPattern125-11-12",
      "derivedFromProfilePath": "tools/evaluator-training/out/trained-move-ordering-profile.json",
      "actionChain": [
        {
          "label": "edgePattern@11-12=x1.25",
          "type": "scale",
          "featureKey": "edgePattern",
          "range": {
            "key": "11-12",
            "minEmpties": 11,
            "maxEmpties": 12
          },
          "scale": 1.25
        },
        {
          "label": "cornerPattern@11-12=x1.25",
          "type": "scale",
          "featureKey": "cornerPattern",
          "range": {
            "key": "11-12",
            "minEmpties": 11,
            "maxEmpties": 12
          },
          "scale": 1.25
        }
      ]
    },
    "selectedFromSmallValidationPath": "benchmarks/stage43_candidateH2_vs_candidateF_seed1_4_fullsuite_validation_20260330.json",
    "selectedFromBenchmarkSummaryPath": "benchmarks/stage44_candidateH2_current_apples_to_apples_24seed_20260330.json"
  },
  "featureKeys": [
    "mobility",
    "corners",
    "cornerAdjacency",
    "edgePattern",
    "cornerPattern",
    "discDifferential",
    "parity"
  ],
  "trainedBuckets": [
    {
      "key": "child-11-12",
      "minEmpties": 11,
      "maxEmpties": 12,
      "weights": {
        "mobility": 0,
        "corners": 6.411028,
        "cornerAdjacency": -28.093532,
        "edgePattern": -183.444529,
        "cornerPattern": 461.787356,
        "discDifferential": 0,
        "parity": 2.261603
      }
    },
    {
      "key": "child-15-16",
      "minEmpties": 15,
      "maxEmpties": 16,
      "weights": {
        "mobility": 30.294982,
        "corners": -3.826455,
        "cornerAdjacency": -1.419264,
        "edgePattern": -28.068467,
        "cornerPattern": 87.712837,
        "discDifferential": 8.814233,
        "parity": 0
      }
    },
    {
      "key": "child-17-18",
      "minEmpties": 17,
      "maxEmpties": 18,
      "weights": {
        "mobility": 28.839259,
        "corners": -0.772686,
        "cornerAdjacency": 2.923797,
        "edgePattern": -46.615311,
        "cornerPattern": 115.962661,
        "discDifferential": 5.858417,
        "parity": 0
      }
    }
  ]
});
const GENERATED_TUPLE_RESIDUAL_PROFILE = Object.freeze({
  "version": 1,
  "name": "trained-tuple-residual-stage38-calibrated",
  "description": "phase-linear evaluator 위에 얹는 tuple residual evaluator입니다. (bucket bias recentered)",
  "stage": {
    "number": 38,
    "tag": "stage38",
    "file": "stage-info.json",
    "label": "Stage 38",
    "updatedAt": "2026-04-02T09:06:54+09:00",
    "kind": "tuple-residual-profile"
  },
  "source": {
    "inputFiles": [
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000000.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000001.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000002.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000003.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000004.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000005.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000006.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000007.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000008.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000009.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000010.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000011.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000012.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000013.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000014.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000015.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000016.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000017.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000018.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000019.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000020.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000021.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000022.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000023.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000024.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000025.txt"
    ],
    "evaluationProfileName": "trained-phase-linear-v1",
    "evaluationProfilePath": "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\out\\trained-evaluation-profile.json",
    "layoutName": "orthogonal-adjacent-pairs-outer2-v1",
    "phaseBuckets": [
      {
        "key": "midgame-c",
        "minEmpties": 20,
        "maxEmpties": 27
      },
      {
        "key": "late-a",
        "minEmpties": 13,
        "maxEmpties": 19
      },
      {
        "key": "late-b",
        "minEmpties": 7,
        "maxEmpties": 12
      },
      {
        "key": "endgame",
        "minEmpties": 0,
        "maxEmpties": 6
      }
    ],
    "targetScale": 3000,
    "holdoutMod": 10,
    "holdoutResidue": 0,
    "sampleStride": 4,
    "sampleResidue": 0,
    "epochs": 1,
    "learningRate": 0.05,
    "regularization": 0.0005,
    "gradientClip": 90000,
    "minVisits": 32,
    "seenSamples": 25514097,
    "selectedTrainSamples": 2700351,
    "seedProfileName": null
  },
  "diagnostics": {
    "layout": {
      "name": "orthogonal-adjacent-pairs-outer2-v1",
      "tupleCount": 56,
      "maxTupleLength": 2,
      "totalTableSize": 504
    },
    "training": {
      "scannedSamples": 25514097,
      "selectedTrainSamples": 2700351,
      "outsideBucketSamples": 12014097,
      "holdoutSamples": 1350214,
      "strideSkippedSamples": 9449435,
      "epochSummaries": [
        {
          "epoch": 1,
          "scannedSamples": 25514097,
          "outsideBucketSamples": 12014097,
          "holdoutSamples": 1350214,
          "strideSkippedSamples": 9449435,
          "selectedTrainSamples": 2700351,
          "trainResidual": {
            "count": 2700351,
            "mae": 19984.981522594462,
            "rmse": 25490.172188628403,
            "meanResidual": 117.65071062744583,
            "stdDevResidual": 25489.900676860507,
            "maxAbsResidual": 232278.5383228885,
            "maeInStones": 6.661660507531487,
            "rmseInStones": 8.496724062876135,
            "meanResidualInStones": 0.039216903542481946,
            "stdDevResidualInStones": 8.496633558953503,
            "maxAbsResidualInStones": 77.42617944096283
          }
        }
      ]
    },
    "bucketTrainingSummary": [
      {
        "key": "midgame-c",
        "minEmpties": 20,
        "maxEmpties": 27,
        "selectedTrainUpdates": 800207,
        "holdoutSamples": 400407,
        "strideSkippedSamples": 2799386
      },
      {
        "key": "late-a",
        "minEmpties": 13,
        "maxEmpties": 19,
        "selectedTrainUpdates": 701041,
        "holdoutSamples": 349699,
        "strideSkippedSamples": 2449260
      },
      {
        "key": "late-b",
        "minEmpties": 7,
        "maxEmpties": 12,
        "selectedTrainUpdates": 599280,
        "holdoutSamples": 299578,
        "strideSkippedSamples": 2101142
      },
      {
        "key": "endgame",
        "minEmpties": 0,
        "maxEmpties": 6,
        "selectedTrainUpdates": 599823,
        "holdoutSamples": 300530,
        "strideSkippedSamples": 2099647
      }
    ],
    "weightStatsByBucket": [
      {
        "key": "midgame-c",
        "minEmpties": 20,
        "maxEmpties": 27,
        "totalWeights": 504,
        "visitedWeights": 504,
        "retainedWeights": 504,
        "nonZeroCount": 504,
        "meanAbsWeight": 263.83965208593,
        "maxAbsWeight": 1078.3255366899805
      },
      {
        "key": "late-a",
        "minEmpties": 13,
        "maxEmpties": 19,
        "totalWeights": 504,
        "visitedWeights": 504,
        "retainedWeights": 504,
        "nonZeroCount": 504,
        "meanAbsWeight": 208.06740584548635,
        "maxAbsWeight": 1093.5703581965395
      },
      {
        "key": "late-b",
        "minEmpties": 7,
        "maxEmpties": 12,
        "totalWeights": 504,
        "visitedWeights": 504,
        "retainedWeights": 504,
        "nonZeroCount": 504,
        "meanAbsWeight": 214.71869826026366,
        "maxAbsWeight": 1227.535832628974
      },
      {
        "key": "endgame",
        "minEmpties": 0,
        "maxEmpties": 6,
        "totalWeights": 504,
        "visitedWeights": 504,
        "retainedWeights": 504,
        "nonZeroCount": 504,
        "meanAbsWeight": 297.8930890858947,
        "maxAbsWeight": 1317.1255698824389
      }
    ],
    "allSamples": {
      "base": {
        "count": 25514097,
        "mae": 18651.49042884018,
        "rmse": 24372.89129135579,
        "meanResidual": 10.341334753097474,
        "stdDevResidual": 24372.889097459134,
        "maxAbsResidual": 419087,
        "maeInStones": 6.21716347628006,
        "rmseInStones": 8.124297097118596,
        "meanResidualInStones": 0.0034471115843658245,
        "stdDevResidualInStones": 8.124296365819712,
        "maxAbsResidualInStones": 139.69566666666665
      },
      "candidate": {
        "count": 25514097,
        "mae": 18495.388653809696,
        "rmse": 24184.813045313676,
        "meanResidual": -464.96844516974284,
        "stdDevResidual": 24180.34297485813,
        "maxAbsResidual": 419087,
        "maeInStones": 6.1651295512698985,
        "rmseInStones": 8.061604348437893,
        "meanResidualInStones": -0.1549894817232476,
        "stdDevResidualInStones": 8.06011432495271,
        "maxAbsResidualInStones": 139.69566666666665
      },
      "delta": {
        "mae": -156.10177503048544,
        "rmse": -188.0782460421142,
        "meanResidual": -475.30977992284033,
        "maeInStones": -0.05203392501016181,
        "rmseInStones": -0.06269274868070474,
        "meanResidualInStones": -0.15843659330761345
      }
    },
    "selectedAll": {
      "base": {
        "count": 13500000,
        "mae": 20300.247173777778,
        "rmse": 25874.427898569644,
        "meanResidual": 6.865125333333333,
        "stdDevResidual": 25874.4269878259,
        "maxAbsResidual": 236637,
        "maeInStones": 6.766749057925926,
        "rmseInStones": 8.624809299523214,
        "meanResidualInStones": 0.0022883751111111112,
        "stdDevResidualInStones": 8.624808995941967,
        "maxAbsResidualInStones": 78.879
      },
      "candidate": {
        "count": 13500000,
        "mae": 20005.225260444444,
        "rmse": 25538.7142488628,
        "meanResidual": -891.4385657777777,
        "stdDevResidual": 25523.15150541782,
        "maxAbsResidual": 238296,
        "maeInStones": 6.668408420148148,
        "rmseInStones": 8.512904749620933,
        "meanResidualInStones": -0.29714618859259256,
        "stdDevResidualInStones": 8.507717168472606,
        "maxAbsResidualInStones": 79.432
      },
      "delta": {
        "mae": -295.02191333333394,
        "rmse": -335.71364970684226,
        "meanResidual": -898.3036911111111,
        "maeInStones": -0.09834063777777798,
        "rmseInStones": -0.11190454990228076,
        "meanResidualInStones": -0.2994345637037037
      }
    },
    "holdoutSelected": {
      "base": {
        "count": 1350214,
        "mae": 20317.01745649208,
        "rmse": 25890.271563141137,
        "meanResidual": -14.074468195411987,
        "stdDevResidual": 25890.267737559992,
        "maxAbsResidual": 212675,
        "maeInStones": 6.772339152164027,
        "rmseInStones": 8.630090521047046,
        "meanResidualInStones": -0.004691489398470662,
        "stdDevResidualInStones": 8.63008924585333,
        "maxAbsResidualInStones": 70.89166666666667
      },
      "candidate": {
        "count": 1350214,
        "mae": 20021.5997886261,
        "rmse": 25555.537528500747,
        "meanResidual": -916.4654869524386,
        "stdDevResidual": 25539.099228082323,
        "maxAbsResidual": 209142,
        "maeInStones": 6.6738665962087,
        "rmseInStones": 8.51851250950025,
        "meanResidualInStones": -0.3054884956508129,
        "stdDevResidualInStones": 8.51303307602744,
        "maxAbsResidualInStones": 69.714
      },
      "delta": {
        "mae": -295.41766786598237,
        "rmse": -334.73403464039075,
        "meanResidual": -902.3910187570266,
        "maeInStones": -0.09847255595532746,
        "rmseInStones": -0.11157801154679692,
        "meanResidualInStones": -0.3007970062523422
      }
    },
    "byBucket": [
      {
        "key": "midgame-c",
        "minEmpties": 20,
        "maxEmpties": 27,
        "selectedTrainUpdates": 800207,
        "weightStats": {
          "key": "midgame-c",
          "minEmpties": 20,
          "maxEmpties": 27,
          "totalWeights": 504,
          "visitedWeights": 504,
          "retainedWeights": 504,
          "nonZeroCount": 504,
          "meanAbsWeight": 263.83965208593,
          "maxAbsWeight": 1078.3255366899805
        },
        "all": {
          "base": {
            "count": 4000000,
            "mae": 20937.25665425,
            "rmse": 26844.49929718129,
            "meanResidual": 11.54319625,
            "stdDevResidual": 26844.496815380746,
            "maxAbsResidual": 233660,
            "maeInStones": 6.9790855514166665,
            "rmseInStones": 8.948166432393764,
            "meanResidualInStones": 0.0038477320833333333,
            "stdDevResidualInStones": 8.948165605126915,
            "maxAbsResidualInStones": 77.88666666666667
          },
          "candidate": {
            "count": 4000000,
            "mae": 20646.93202525,
            "rmse": 26526.70631193879,
            "meanResidual": -1386.12543225,
            "stdDevResidual": 26490.46628592866,
            "maxAbsResidual": 238296,
            "maeInStones": 6.882310675083334,
            "rmseInStones": 8.84223543731293,
            "meanResidualInStones": -0.46204181074999995,
            "stdDevResidualInStones": 8.830155428642888,
            "maxAbsResidualInStones": 79.432
          },
          "delta": {
            "mae": -290.3246289999988,
            "rmse": -317.79298524250044,
            "meanResidual": -1397.6686284999998,
            "maeInStones": -0.09677487633333294,
            "rmseInStones": -0.10593099508083348,
            "meanResidualInStones": -0.4658895428333333
          }
        },
        "holdout": {
          "base": {
            "count": 400407,
            "mae": 20927.38468608191,
            "rmse": 26817.790643269378,
            "meanResidual": 12.251209394441156,
            "stdDevResidual": 26817.787844900537,
            "maxAbsResidual": 212675,
            "maeInStones": 6.975794895360637,
            "rmseInStones": 8.93926354775646,
            "meanResidualInStones": 0.004083736464813719,
            "stdDevResidualInStones": 8.939262614966845,
            "maxAbsResidualInStones": 70.89166666666667
          },
          "candidate": {
            "count": 400407,
            "mae": 20633.135914207294,
            "rmse": 26496.720137015833,
            "meanResidual": -1388.2398709313275,
            "stdDevResidual": 26460.32819297782,
            "maxAbsResidual": 209142,
            "maeInStones": 6.877711971402431,
            "rmseInStones": 8.832240045671945,
            "meanResidualInStones": -0.46274662364377583,
            "stdDevResidualInStones": 8.820109397659273,
            "maxAbsResidualInStones": 69.714
          },
          "delta": {
            "mae": -294.24877187461607,
            "rmse": -321.0705062535453,
            "meanResidual": -1400.4910803257685,
            "maeInStones": -0.09808292395820535,
            "rmseInStones": -0.10702350208451511,
            "meanResidualInStones": -0.4668303601085895
          }
        }
      },
      {
        "key": "late-a",
        "minEmpties": 13,
        "maxEmpties": 19,
        "selectedTrainUpdates": 701041,
        "weightStats": {
          "key": "late-a",
          "minEmpties": 13,
          "maxEmpties": 19,
          "totalWeights": 504,
          "visitedWeights": 504,
          "retainedWeights": 504,
          "nonZeroCount": 504,
          "meanAbsWeight": 208.06740584548635,
          "maxAbsWeight": 1093.5703581965395
        },
        "all": {
          "base": {
            "count": 3500000,
            "mae": 21404.061378857143,
            "rmse": 27109.665833887568,
            "meanResidual": -1.5095165714285714,
            "stdDevResidual": 27109.665791861225,
            "maxAbsResidual": 236637,
            "maeInStones": 7.134687126285714,
            "rmseInStones": 9.036555277962522,
            "meanResidualInStones": -0.0005031721904761905,
            "stdDevResidualInStones": 9.036555263953742,
            "maxAbsResidualInStones": 78.879
          },
          "candidate": {
            "count": 3500000,
            "mae": 21162.561432285715,
            "rmse": 26832.168008535675,
            "meanResidual": 135.53663514285714,
            "stdDevResidual": 26831.825690005135,
            "maxAbsResidual": 237779,
            "maeInStones": 7.054187144095239,
            "rmseInStones": 8.944056002845224,
            "meanResidualInStones": 0.04517887838095238,
            "stdDevResidualInStones": 8.943941896668377,
            "maxAbsResidualInStones": 79.25966666666666
          },
          "delta": {
            "mae": -241.49994657142815,
            "rmse": -277.49782535189297,
            "meanResidual": 137.0461517142857,
            "maeInStones": -0.08049998219047605,
            "rmseInStones": -0.09249927511729766,
            "meanResidualInStones": 0.04568205057142857
          }
        },
        "holdout": {
          "base": {
            "count": 349699,
            "mae": 21429.874643622086,
            "rmse": 27155.606321734427,
            "meanResidual": -112.70411696916491,
            "stdDevResidual": 27155.37244235551,
            "maxAbsResidual": 180665,
            "maeInStones": 7.143291547874028,
            "rmseInStones": 9.051868773911476,
            "meanResidualInStones": -0.037568038989721636,
            "stdDevResidualInStones": 9.051790814118503,
            "maxAbsResidualInStones": 60.221666666666664
          },
          "candidate": {
            "count": 349699,
            "mae": 21185.438091044012,
            "rmse": 26875.766799754252,
            "meanResidual": 25.72608157300993,
            "stdDevResidual": 26875.754486962775,
            "maxAbsResidual": 180704,
            "maeInStones": 7.061812697014671,
            "rmseInStones": 8.958588933251418,
            "meanResidualInStones": 0.008575360524336644,
            "stdDevResidualInStones": 8.958584828987592,
            "maxAbsResidualInStones": 60.23466666666667
          },
          "delta": {
            "mae": -244.43655257807404,
            "rmse": -279.83952198017505,
            "meanResidual": 138.43019854217485,
            "maeInStones": -0.08147885085935802,
            "rmseInStones": -0.09327984066005834,
            "meanResidualInStones": 0.046143399514058284
          }
        }
      },
      {
        "key": "late-b",
        "minEmpties": 7,
        "maxEmpties": 12,
        "selectedTrainUpdates": 599280,
        "weightStats": {
          "key": "late-b",
          "minEmpties": 7,
          "maxEmpties": 12,
          "totalWeights": 504,
          "visitedWeights": 504,
          "retainedWeights": 504,
          "nonZeroCount": 504,
          "meanAbsWeight": 214.71869826026366,
          "maxAbsWeight": 1227.535832628974
        },
        "all": {
          "base": {
            "count": 3000000,
            "mae": 20795.154942333334,
            "rmse": 26195.852283221207,
            "meanResidual": 5.325427,
            "stdDevResidual": 26195.851741910836,
            "maxAbsResidual": 163534,
            "maeInStones": 6.931718314111111,
            "rmseInStones": 8.731950761073735,
            "meanResidualInStones": 0.0017751423333333335,
            "stdDevResidualInStones": 8.731950580636946,
            "maxAbsResidualInStones": 54.51133333333333
          },
          "candidate": {
            "count": 3000000,
            "mae": 20522.639878666665,
            "rmse": 25872.432366401386,
            "meanResidual": -264.1721713333333,
            "stdDevResidual": 25871.08365758781,
            "maxAbsResidual": 160898,
            "maeInStones": 6.840879959555555,
            "rmseInStones": 8.624144122133796,
            "meanResidualInStones": -0.08805739044444444,
            "stdDevResidualInStones": 8.623694552529269,
            "maxAbsResidualInStones": 53.632666666666665
          },
          "delta": {
            "mae": -272.51506366666945,
            "rmse": -323.4199168198211,
            "meanResidual": -269.4975983333333,
            "maeInStones": -0.09083835455555649,
            "rmseInStones": -0.10780663893994036,
            "meanResidualInStones": -0.08983253277777777
          }
        },
        "holdout": {
          "base": {
            "count": 299578,
            "mae": 20823.697678067147,
            "rmse": 26231.68139850309,
            "meanResidual": -13.41526080019227,
            "stdDevResidual": 26231.677968123782,
            "maxAbsResidual": 150779,
            "maeInStones": 6.941232559355716,
            "rmseInStones": 8.74389379950103,
            "meanResidualInStones": -0.00447175360006409,
            "stdDevResidualInStones": 8.743892656041261,
            "maxAbsResidualInStones": 50.25966666666667
          },
          "candidate": {
            "count": 299578,
            "mae": 20553.486187236715,
            "rmse": 25912.151059859458,
            "meanResidual": -290.1272690250953,
            "stdDevResidual": 25910.5267935012,
            "maxAbsResidual": 149755,
            "maeInStones": 6.8511620624122385,
            "rmseInStones": 8.637383686619819,
            "meanResidualInStones": -0.09670908967503176,
            "stdDevResidualInStones": 8.6368422645004,
            "maxAbsResidualInStones": 49.91833333333334
          },
          "delta": {
            "mae": -270.211490830432,
            "rmse": -319.5303386436317,
            "meanResidual": -276.71200822490306,
            "maeInStones": -0.09007049694347734,
            "rmseInStones": -0.10651011288121057,
            "meanResidualInStones": -0.09223733607496769
          }
        }
      },
      {
        "key": "endgame",
        "minEmpties": 0,
        "maxEmpties": 6,
        "selectedTrainUpdates": 599823,
        "weightStats": {
          "key": "endgame",
          "minEmpties": 0,
          "maxEmpties": 6,
          "totalWeights": 504,
          "visitedWeights": 504,
          "retainedWeights": 504,
          "nonZeroCount": 504,
          "meanAbsWeight": 297.8930890858947,
          "maxAbsWeight": 1317.1255698824389
        },
        "all": {
          "base": {
            "count": 3000000,
            "mae": 17668.210192,
            "rmse": 22543.407915311294,
            "meanResidual": 11.937811333333334,
            "stdDevResidual": 22543.404754490402,
            "maxAbsResidual": 131379,
            "maeInStones": 5.889403397333333,
            "rmseInStones": 7.5144693051037645,
            "meanResidualInStones": 0.003979270444444445,
            "stdDevResidualInStones": 7.514468251496801,
            "maxAbsResidualInStones": 43.793
          },
          "candidate": {
            "count": 3000000,
            "mae": 17281.976088666666,
            "rmse": 22078.336238742886,
            "meanResidual": -2057.260206,
            "stdDevResidual": 21982.27948861983,
            "maxAbsResidual": 128431,
            "maeInStones": 5.760658696222222,
            "rmseInStones": 7.359445412914296,
            "meanResidualInStones": -0.685753402,
            "stdDevResidualInStones": 7.327426496206611,
            "maxAbsResidualInStones": 42.81033333333333
          },
          "delta": {
            "mae": -386.2341033333323,
            "rmse": -465.0716765684083,
            "meanResidual": -2069.198017333333,
            "maeInStones": -0.12874470111111078,
            "rmseInStones": -0.15502389218946944,
            "meanResidualInStones": -0.6897326724444444
          }
        },
        "holdout": {
          "base": {
            "count": 300530,
            "mae": 17703.798795461353,
            "rmse": 22568.349962006083,
            "meanResidual": 64.9599707183975,
            "stdDevResidual": 22568.256472527606,
            "maxAbsResidual": 121634,
            "maeInStones": 5.901266265153784,
            "rmseInStones": 7.522783320668695,
            "meanResidualInStones": 0.021653323572799168,
            "stdDevResidualInStones": 7.522752157509202,
            "maxAbsResidualInStones": 40.544666666666664
          },
          "candidate": {
            "count": 300530,
            "mae": 17322.37542009117,
            "rmse": 22112.68926496283,
            "meanResidual": -2008.5988320633548,
            "stdDevResidual": 22021.27510523939,
            "maxAbsResidual": 121632,
            "maeInStones": 5.774125140030391,
            "rmseInStones": 7.370896421654277,
            "meanResidualInStones": -0.6695329440211183,
            "stdDevResidualInStones": 7.340425035079797,
            "maxAbsResidualInStones": 40.544
          },
          "delta": {
            "mae": -381.423375370181,
            "rmse": -455.6606970432513,
            "meanResidual": -2073.5588027817525,
            "maeInStones": -0.12714112512339368,
            "rmseInStones": -0.1518868990144171,
            "meanResidualInStones": -0.6911862675939175
          }
        }
      }
    ],
    "createdAt": "2026-04-02T15:37:47.889Z"
  },
  "calibration": {
    "version": 1,
    "mode": "corpus",
    "scope": "holdout-selected",
    "shrink": 1,
    "maxBiasStones": 1.5,
    "targetScale": 3000,
    "holdoutMod": 10,
    "holdoutResidue": 0,
    "sourceTupleProfileName": "trained-tuple-residual-stage38",
    "sourceTupleProfileStage": {
      "number": 38,
      "tag": "stage38",
      "file": "stage-info.json",
      "label": "Stage 38",
      "updatedAt": "2026-04-02T09:06:54+09:00",
      "kind": "tuple-residual-profile"
    },
    "generatedAt": "2026-04-03T01:36:09.552Z",
    "outputProfileName": "trained-tuple-residual-stage38-calibrated",
    "outputDescription": "phase-linear evaluator 위에 얹는 tuple residual evaluator입니다. (bucket bias recentered)",
    "bucketBiasAdjustments": [
      {
        "key": "midgame-c",
        "minEmpties": 20,
        "maxEmpties": 27,
        "previousBias": 0,
        "deltaBias": 1388.2398709313275,
        "nextBias": 1388.2398709313275
      },
      {
        "key": "late-a",
        "minEmpties": 13,
        "maxEmpties": 19,
        "previousBias": 0,
        "deltaBias": -25.72608157300993,
        "nextBias": -25.72608157300993
      },
      {
        "key": "late-b",
        "minEmpties": 7,
        "maxEmpties": 12,
        "previousBias": 0,
        "deltaBias": 290.1272690250953,
        "nextBias": 290.1272690250953
      },
      {
        "key": "endgame",
        "minEmpties": 0,
        "maxEmpties": 6,
        "previousBias": 0,
        "deltaBias": 2008.5988320633548,
        "nextBias": 2008.5988320633548
      }
    ],
    "evaluationProfileName": "trained-phase-linear-v1",
    "verifiedDiagnostics": {
      "calibrationReference": "pre-calibration-vs-calibrated",
      "allSamples": {
        "base": {
          "count": 25514097,
          "mae": 18495.388653809696,
          "rmse": 24184.813045313676,
          "meanResidual": -464.96844516974284,
          "stdDevResidual": 24180.34297485813,
          "maxAbsResidual": 419087,
          "maeInStones": 6.1651295512698985,
          "rmseInStones": 8.061604348437893,
          "meanResidualInStones": -0.1549894817232476,
          "stdDevResidualInStones": 8.06011432495271,
          "maxAbsResidualInStones": 139.69566666666665
        },
        "candidate": {
          "count": 25514097,
          "mae": 18488.138984421043,
          "rmse": 24168.111312576053,
          "meanResidual": 19.434227047110465,
          "stdDevResidual": 24168.10349878297,
          "maxAbsResidual": 419087,
          "maeInStones": 6.1627129948070145,
          "rmseInStones": 8.056037104192018,
          "meanResidualInStones": 0.006478075682370155,
          "stdDevResidualInStones": 8.056034499594324,
          "maxAbsResidualInStones": 139.69566666666665
        },
        "delta": {
          "mae": -7.249669388653274,
          "rmse": -16.701732737623388,
          "meanResidual": 484.4026722168533,
          "maeInStones": -0.0024165564628844246,
          "rmseInStones": -0.005567244245874463,
          "meanResidualInStones": 0.16146755740561777
        }
      },
      "selectedAll": {
        "base": {
          "count": 13500000,
          "mae": 20005.225260444444,
          "rmse": 25538.7142488628,
          "meanResidual": -891.4385657777777,
          "stdDevResidual": 25523.15150541782,
          "maxAbsResidual": 238296,
          "maeInStones": 6.668408420148148,
          "rmseInStones": 8.512904749620933,
          "meanResidualInStones": -0.29714618859259256,
          "stdDevResidualInStones": 8.507717168472606,
          "maxAbsResidualInStones": 79.432
        },
        "candidate": {
          "count": 13500000,
          "mae": 19991.523870222223,
          "rmse": 25508.815295905264,
          "meanResidual": 24.050083555555556,
          "stdDevResidual": 25508.80395851776,
          "maxAbsResidual": 237753,
          "maeInStones": 6.663841290074075,
          "rmseInStones": 8.50293843196842,
          "meanResidualInStones": 0.00801669451851852,
          "stdDevResidualInStones": 8.502934652839254,
          "maxAbsResidualInStones": 79.251
        },
        "delta": {
          "mae": -13.701390222220653,
          "rmse": -29.898952957537404,
          "meanResidual": 915.4886493333333,
          "maeInStones": -0.004567130074073551,
          "rmseInStones": -0.009966317652512468,
          "meanResidualInStones": 0.3051628831111111
        }
      },
      "holdoutSelected": {
        "base": {
          "count": 1350214,
          "mae": 20021.5997886261,
          "rmse": 25555.537528500747,
          "meanResidual": -916.4654869524386,
          "stdDevResidual": 25539.099228082323,
          "maxAbsResidual": 209142,
          "maeInStones": 6.6738665962087,
          "rmseInStones": 8.51851250950025,
          "meanResidualInStones": -0.3054884956508129,
          "stdDevResidualInStones": 8.51303307602744,
          "maxAbsResidualInStones": 69.714
        },
        "candidate": {
          "count": 1350214,
          "mae": 20008.745362586968,
          "rmse": 25526.40137050623,
          "meanResidual": -0.00037549603248077714,
          "stdDevResidual": 25526.40137050623,
          "maxAbsResidual": 210530,
          "maeInStones": 6.66958178752899,
          "rmseInStones": 8.508800456835411,
          "meanResidualInStones": -1.2516534416025906e-7,
          "stdDevResidualInStones": 8.508800456835411,
          "maxAbsResidualInStones": 70.17666666666666
        },
        "delta": {
          "mae": -12.854426039131795,
          "rmse": -29.136157994515088,
          "meanResidual": 916.4651114564061,
          "maeInStones": -0.004284808679710598,
          "rmseInStones": -0.009712052664838362,
          "meanResidualInStones": 0.30548837048546873
        }
      },
      "byBucket": [
        {
          "key": "midgame-c",
          "minEmpties": 20,
          "maxEmpties": 27,
          "all": {
            "key": "midgame-c",
            "minEmpties": 20,
            "maxEmpties": 27,
            "base": {
              "count": 4000000,
              "mae": 20646.93202525,
              "rmse": 26526.70631193879,
              "meanResidual": -1386.12543225,
              "stdDevResidual": 26490.46628592866,
              "maxAbsResidual": 238296,
              "maeInStones": 6.882310675083334,
              "rmseInStones": 8.84223543731293,
              "meanResidualInStones": -0.46204181074999995,
              "stdDevResidualInStones": 8.830155428642888,
              "maxAbsResidualInStones": 79.432
            },
            "candidate": {
              "count": 4000000,
              "mae": 20625.42049975,
              "rmse": 26490.466447177685,
              "meanResidual": 2.11464125,
              "stdDevResidual": 26490.466362775478,
              "maxAbsResidual": 236908,
              "maeInStones": 6.875140166583333,
              "rmseInStones": 8.830155482392561,
              "meanResidualInStones": 0.0007048804166666666,
              "stdDevResidualInStones": 8.830155454258493,
              "maxAbsResidualInStones": 78.96933333333334
            },
            "delta": {
              "mae": -21.51152550000188,
              "rmse": -36.2398647611044,
              "meanResidual": 1388.2400734999999,
              "maeInStones": -0.007170508500000627,
              "rmseInStones": -0.012079954920368133,
              "meanResidualInStones": 0.4627466911666666
            }
          },
          "holdout": {
            "key": "midgame-c",
            "minEmpties": 20,
            "maxEmpties": 27,
            "base": {
              "count": 400407,
              "mae": 20633.135914207294,
              "rmse": 26496.720137015833,
              "meanResidual": -1388.2398709313275,
              "stdDevResidual": 26460.32819297782,
              "maxAbsResidual": 209142,
              "maeInStones": 6.877711971402431,
              "rmseInStones": 8.832240045671945,
              "meanResidualInStones": -0.46274662364377583,
              "stdDevResidualInStones": 8.820109397659273,
              "maxAbsResidualInStones": 69.714
            },
            "candidate": {
              "count": 400407,
              "mae": 20612.08734362786,
              "rmse": 26460.32808211966,
              "meanResidual": -0.0002872077660979953,
              "stdDevResidual": 26460.32808211966,
              "maxAbsResidual": 210530,
              "maeInStones": 6.870695781209287,
              "rmseInStones": 8.820109360706553,
              "meanResidualInStones": -9.57359220326651e-8,
              "stdDevResidualInStones": 8.820109360706553,
              "maxAbsResidualInStones": 70.17666666666666
            },
            "delta": {
              "mae": -21.048570579434454,
              "rmse": -36.39205489617234,
              "meanResidual": 1388.2395837235613,
              "maeInStones": -0.007016190193144818,
              "rmseInStones": -0.01213068496539078,
              "meanResidualInStones": 0.46274652790785376
            }
          }
        },
        {
          "key": "late-a",
          "minEmpties": 13,
          "maxEmpties": 19,
          "all": {
            "key": "late-a",
            "minEmpties": 13,
            "maxEmpties": 19,
            "base": {
              "count": 3500000,
              "mae": 21162.561432285715,
              "rmse": 26832.168008535675,
              "meanResidual": 135.53663514285714,
              "stdDevResidual": 26831.825690005135,
              "maxAbsResidual": 237779,
              "maeInStones": 7.054187144095239,
              "rmseInStones": 8.944056002845224,
              "meanResidualInStones": 0.04517887838095238,
              "stdDevResidualInStones": 8.943941896668377,
              "maxAbsResidualInStones": 79.25966666666666
            },
            "candidate": {
              "count": 3500000,
              "mae": 21162.454006,
              "rmse": 26832.05047727273,
              "meanResidual": 109.81015342857143,
              "stdDevResidual": 26831.82577733233,
              "maxAbsResidual": 237753,
              "maeInStones": 7.054151335333334,
              "rmseInStones": 8.944016825757576,
              "meanResidualInStones": 0.03660338447619047,
              "stdDevResidualInStones": 8.943941925777443,
              "maxAbsResidualInStones": 79.251
            },
            "delta": {
              "mae": -0.10742628571460955,
              "rmse": -0.11753126294570393,
              "meanResidual": -25.72648171428571,
              "maeInStones": -0.00003580876190486985,
              "rmseInStones": -0.00003917708764856798,
              "meanResidualInStones": -0.008575493904761904
            }
          },
          "holdout": {
            "key": "late-a",
            "minEmpties": 13,
            "maxEmpties": 19,
            "base": {
              "count": 349699,
              "mae": 21185.438091044012,
              "rmse": 26875.766799754252,
              "meanResidual": 25.72608157300993,
              "stdDevResidual": 26875.754486962775,
              "maxAbsResidual": 180704,
              "maeInStones": 7.061812697014671,
              "rmseInStones": 8.958588933251418,
              "meanResidualInStones": 0.008575360524336644,
              "stdDevResidualInStones": 8.958584828987592,
              "maxAbsResidualInStones": 60.23466666666667
            },
            "candidate": {
              "count": 349699,
              "mae": 21185.434056145426,
              "rmse": 26875.754817717752,
              "meanResidual": -0.0006062356483718856,
              "stdDevResidual": 26875.754817717745,
              "maxAbsResidual": 180679,
              "maeInStones": 7.061811352048475,
              "rmseInStones": 8.95858493923925,
              "meanResidualInStones": -2.020785494572952e-7,
              "stdDevResidualInStones": 8.958584939239248,
              "maxAbsResidualInStones": 60.226333333333336
            },
            "delta": {
              "mae": -0.004034898585814517,
              "rmse": -0.011982036499830429,
              "meanResidual": -25.726687808658305,
              "maeInStones": -0.0000013449661952715057,
              "rmseInStones": -0.000003994012166610143,
              "meanResidualInStones": -0.008575562602886102
            }
          }
        },
        {
          "key": "late-b",
          "minEmpties": 7,
          "maxEmpties": 12,
          "all": {
            "key": "late-b",
            "minEmpties": 7,
            "maxEmpties": 12,
            "base": {
              "count": 3000000,
              "mae": 20522.639878666665,
              "rmse": 25872.432366401386,
              "meanResidual": -264.1721713333333,
              "stdDevResidual": 25871.08365758781,
              "maxAbsResidual": 160898,
              "maeInStones": 6.840879959555555,
              "rmseInStones": 8.624144122133796,
              "meanResidualInStones": -0.08805739044444444,
              "stdDevResidualInStones": 8.623694552529269,
              "maxAbsResidualInStones": 53.632666666666665
            },
            "candidate": {
              "count": 3000000,
              "mae": 20522.801309666665,
              "rmse": 25871.096663588545,
              "meanResidual": 25.955244333333333,
              "stdDevResidual": 25871.08364375242,
              "maxAbsResidual": 161189,
              "maeInStones": 6.840933769888888,
              "rmseInStones": 8.623698887862849,
              "meanResidualInStones": 0.00865174811111111,
              "stdDevResidualInStones": 8.623694547917474,
              "maxAbsResidualInStones": 53.72966666666667
            },
            "delta": {
              "mae": 0.16143100000044797,
              "rmse": -1.3357028128411912,
              "meanResidual": 290.12741566666665,
              "maeInStones": 0.00005381033333348266,
              "rmseInStones": -0.00044523427094706375,
              "meanResidualInStones": 0.09670913855555555
            }
          },
          "holdout": {
            "key": "late-b",
            "minEmpties": 7,
            "maxEmpties": 12,
            "base": {
              "count": 299578,
              "mae": 20553.486187236715,
              "rmse": 25912.151059859458,
              "meanResidual": -290.1272690250953,
              "stdDevResidual": 25910.5267935012,
              "maxAbsResidual": 149755,
              "maeInStones": 6.8511620624122385,
              "rmseInStones": 8.637383686619819,
              "meanResidualInStones": -0.09670908967503176,
              "stdDevResidualInStones": 8.6368422645004,
              "maxAbsResidualInStones": 49.91833333333334
            },
            "candidate": {
              "count": 299578,
              "mae": 20553.333225403734,
              "rmse": 25910.52728036608,
              "meanResidual": -0.0004773381222920241,
              "stdDevResidual": 25910.527280366074,
              "maxAbsResidual": 150045,
              "maeInStones": 6.851111075134578,
              "rmseInStones": 8.636842426788693,
              "meanResidualInStones": -1.591127074306747e-7,
              "stdDevResidualInStones": 8.636842426788691,
              "maxAbsResidualInStones": 50.015
            },
            "delta": {
              "mae": -0.15296183298050892,
              "rmse": -1.6237794933767873,
              "meanResidual": 290.12679168697304,
              "maeInStones": -0.00005098727766016964,
              "rmseInStones": -0.0005412598311255957,
              "meanResidualInStones": 0.09670893056232434
            }
          }
        },
        {
          "key": "endgame",
          "minEmpties": 0,
          "maxEmpties": 6,
          "all": {
            "key": "endgame",
            "minEmpties": 0,
            "maxEmpties": 6,
            "base": {
              "count": 3000000,
              "mae": 17281.976088666666,
              "rmse": 22078.336238742886,
              "meanResidual": -2057.260206,
              "stdDevResidual": 21982.27948861983,
              "maxAbsResidual": 128431,
              "maeInStones": 5.760658696222222,
              "rmseInStones": 7.359445412914296,
              "meanResidualInStones": -0.685753402,
              "stdDevResidualInStones": 7.327426496206611,
              "maxAbsResidualInStones": 42.81033333333333
            },
            "candidate": {
              "count": 3000000,
              "mae": 17248.965766333335,
              "rmse": 21982.333341190413,
              "meanResidual": -48.66123566666667,
              "stdDevResidual": 21982.279481604157,
              "maxAbsResidual": 126516,
              "maeInStones": 5.749655255444445,
              "rmseInStones": 7.327444447063471,
              "meanResidualInStones": -0.01622041188888889,
              "stdDevResidualInStones": 7.327426493868052,
              "maxAbsResidualInStones": 42.172
            },
            "delta": {
              "mae": -33.010322333331715,
              "rmse": -96.00289755247286,
              "meanResidual": 2008.5989703333332,
              "maeInStones": -0.011003440777777238,
              "rmseInStones": -0.032000965850824285,
              "meanResidualInStones": 0.6695329901111111
            }
          },
          "holdout": {
            "key": "endgame",
            "minEmpties": 0,
            "maxEmpties": 6,
            "base": {
              "count": 300530,
              "mae": 17322.37542009117,
              "rmse": 22112.68926496283,
              "meanResidual": -2008.5988320633548,
              "stdDevResidual": 22021.27510523939,
              "maxAbsResidual": 121632,
              "maeInStones": 5.774125140030391,
              "rmseInStones": 7.370896421654277,
              "meanResidualInStones": -0.6695329440211183,
              "stdDevResidualInStones": 7.340425035079797,
              "maxAbsResidualInStones": 40.544
            },
            "candidate": {
              "count": 300530,
              "mae": 17292.82430705753,
              "rmse": 22021.27647216296,
              "meanResidual": -0.00012311582870262535,
              "stdDevResidual": 22021.27647216296,
              "maxAbsResidual": 119623,
              "maeInStones": 5.764274769019177,
              "rmseInStones": 7.340425490720987,
              "meanResidualInStones": -4.1038609567541786e-8,
              "stdDevResidualInStones": 7.340425490720987,
              "maxAbsResidualInStones": 39.87433333333333
            },
            "delta": {
              "mae": -29.55111303364174,
              "rmse": -91.41279279987066,
              "meanResidual": 2008.5987089475261,
              "maeInStones": -0.009850371011213914,
              "rmseInStones": -0.03047093093329022,
              "meanResidualInStones": 0.6695329029825087
            }
          }
        }
      ],
      "createdAt": "2026-04-03T02:07:04.741Z"
    }
  },
  "featureEncoding": "ternary-side-to-move",
  "layout": {
    "version": 1,
    "name": "orthogonal-adjacent-pairs-outer2-v1",
    "description": "바깥쪽 두 줄/두 칸(file/rank)의 인접 가로/세로 pair 56개로 만든 compact residual layout입니다.",
    "tupleCount": 56,
    "maxTupleLength": 2,
    "totalTableSize": 504,
    "tuples": [
      {
        "key": "A1-B1",
        "squares": [
          0,
          1
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "B1-C1",
        "squares": [
          1,
          2
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "C1-D1",
        "squares": [
          2,
          3
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "D1-E1",
        "squares": [
          3,
          4
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "E1-F1",
        "squares": [
          4,
          5
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "F1-G1",
        "squares": [
          5,
          6
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "G1-H1",
        "squares": [
          6,
          7
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "A2-B2",
        "squares": [
          8,
          9
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "B2-C2",
        "squares": [
          9,
          10
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "C2-D2",
        "squares": [
          10,
          11
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "D2-E2",
        "squares": [
          11,
          12
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "E2-F2",
        "squares": [
          12,
          13
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "F2-G2",
        "squares": [
          13,
          14
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "G2-H2",
        "squares": [
          14,
          15
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "A7-B7",
        "squares": [
          48,
          49
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "B7-C7",
        "squares": [
          49,
          50
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "C7-D7",
        "squares": [
          50,
          51
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "D7-E7",
        "squares": [
          51,
          52
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "E7-F7",
        "squares": [
          52,
          53
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "F7-G7",
        "squares": [
          53,
          54
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "G7-H7",
        "squares": [
          54,
          55
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "A8-B8",
        "squares": [
          56,
          57
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "B8-C8",
        "squares": [
          57,
          58
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "C8-D8",
        "squares": [
          58,
          59
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "D8-E8",
        "squares": [
          59,
          60
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "E8-F8",
        "squares": [
          60,
          61
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "F8-G8",
        "squares": [
          61,
          62
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "G8-H8",
        "squares": [
          62,
          63
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "A1-A2",
        "squares": [
          0,
          8
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "A2-A3",
        "squares": [
          8,
          16
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "A3-A4",
        "squares": [
          16,
          24
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "A4-A5",
        "squares": [
          24,
          32
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "A5-A6",
        "squares": [
          32,
          40
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "A6-A7",
        "squares": [
          40,
          48
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "A7-A8",
        "squares": [
          48,
          56
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "B1-B2",
        "squares": [
          1,
          9
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "B2-B3",
        "squares": [
          9,
          17
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "B3-B4",
        "squares": [
          17,
          25
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "B4-B5",
        "squares": [
          25,
          33
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "B5-B6",
        "squares": [
          33,
          41
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "B6-B7",
        "squares": [
          41,
          49
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "B7-B8",
        "squares": [
          49,
          57
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "G1-G2",
        "squares": [
          6,
          14
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "G2-G3",
        "squares": [
          14,
          22
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "G3-G4",
        "squares": [
          22,
          30
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "G4-G5",
        "squares": [
          30,
          38
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "G5-G6",
        "squares": [
          38,
          46
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "G6-G7",
        "squares": [
          46,
          54
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "G7-G8",
        "squares": [
          54,
          62
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "H1-H2",
        "squares": [
          7,
          15
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "H2-H3",
        "squares": [
          15,
          23
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "H3-H4",
        "squares": [
          23,
          31
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "H4-H5",
        "squares": [
          31,
          39
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "H5-H6",
        "squares": [
          39,
          47
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "H6-H7",
        "squares": [
          47,
          55
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "H7-H8",
        "squares": [
          55,
          63
        ],
        "length": 2,
        "tableSize": 9
      }
    ]
  },
  "trainedBuckets": [
    {
      "key": "midgame-c",
      "minEmpties": 20,
      "maxEmpties": 27,
      "scale": 1,
      "bias": 1388.2398709313275,
      "tupleWeights": [
        [
          -39.989842,
          -79.908668,
          358.171909,
          342.153208,
          179.352322,
          70.543462,
          -219.204604,
          -84.083884,
          -521.432613
        ],
        [
          -49.285187,
          -1007.688624,
          992.180655,
          -467.433172,
          178.564625,
          426.460945,
          594.388674,
          -128.405306,
          -431.691793
        ],
        [
          -104.466515,
          -63.582773,
          232.318175,
          -813.023732,
          -4.400238,
          -239.610568,
          929.938251,
          358.488563,
          -206.283871
        ],
        [
          -117.286093,
          -339.091876,
          517.309694,
          -184.707698,
          149.354324,
          248.052486,
          408.023607,
          48.91114,
          -472.380613
        ],
        [
          -87.041443,
          -647.133234,
          842.212965,
          -194.617448,
          -25.686468,
          254.320183,
          398.801018,
          -23.543749,
          -343.410194
        ],
        [
          -61.691299,
          -574.940206,
          707.1141,
          -770.370595,
          130.355257,
          138.296197,
          801.143527,
          129.075117,
          -390.330017
        ],
        [
          -135.785315,
          221.858686,
          92.738197,
          -203.907702,
          -20.914272,
          -36.244511,
          478.49136,
          -119.453158,
          -350.069286
        ],
        [
          -214.644782,
          22.990133,
          306.787699,
          -663.15072,
          427.393232,
          88.229125,
          662.829937,
          8.861623,
          -444.050412
        ],
        [
          -196.765589,
          27.367878,
          -111.089023,
          -55.396792,
          38.427403,
          436.876699,
          154.718667,
          -93.228862,
          -11.023759
        ],
        [
          -181.920779,
          -114.010503,
          96.841831,
          -154.902587,
          -204.010466,
          360.161042,
          153.397506,
          -146.847682,
          165.790942
        ],
        [
          -181.401401,
          -6.532284,
          -21.438278,
          24.011296,
          -395.951962,
          103.02895,
          -49.469526,
          57.576569,
          451.107428
        ],
        [
          -193.346634,
          -173.680901,
          184.289661,
          -27.379848,
          -140.387006,
          -315.896472,
          150.315551,
          358.295462,
          190.056037
        ],
        [
          -226.558979,
          129.405036,
          163.017545,
          11.888271,
          146.81133,
          -166.059749,
          -39.234095,
          307.665138,
          -181.850716
        ],
        [
          -62.189044,
          -831.310658,
          648.790313,
          305.942977,
          245.981385,
          25.599924,
          -85.073869,
          105.781533,
          -217.07273
        ],
        [
          -117.604026,
          362.027668,
          -145.739458,
          -783.632528,
          112.135838,
          175.637735,
          644.661239,
          260.046189,
          -215.33394
        ],
        [
          -151.132717,
          -65.473567,
          -34.462767,
          152.143304,
          65.521291,
          503.768869,
          -6.028511,
          22.099452,
          -235.308164
        ],
        [
          -227.282288,
          19.607811,
          101.61954,
          -98.438127,
          -222.719153,
          386.334474,
          209.473507,
          -165.404396,
          47.184359
        ],
        [
          -194.567154,
          99.126558,
          -42.480679,
          123.964513,
          -374.219618,
          36.671145,
          16.306841,
          -23.430738,
          371.870908
        ],
        [
          -140.142857,
          -216.975498,
          272.983232,
          8.752084,
          -219.347349,
          -219.036231,
          56.50345,
          317.811312,
          130.940127
        ],
        [
          -154.830823,
          -144.475099,
          246.878557,
          -46.660436,
          76.562569,
          -198.297143,
          32.990235,
          408.439944,
          -76.335623
        ],
        [
          -91.454836,
          -640.914355,
          587.454417,
          -10.194157,
          313.961154,
          150.150421,
          298.592632,
          -0.127773,
          -455.969654
        ],
        [
          -21.300915,
          -298.753788,
          501.891349,
          176.282267,
          47.029819,
          -166.067002,
          217.598866,
          -101.240259,
          -279.411797
        ],
        [
          -82.756736,
          -746.826753,
          957.963654,
          -601.317085,
          114.091913,
          14.949064,
          717.530219,
          189.113766,
          -469.224011
        ],
        [
          -62.35395,
          -511.926754,
          524.095527,
          -527.351013,
          92.064849,
          -194.554533,
          807.836585,
          300.017214,
          -325.765885
        ],
        [
          -8.715218,
          -228.909302,
          435.00909,
          -476.182443,
          171.548517,
          43.232057,
          505.667255,
          177.450617,
          -442.665977
        ],
        [
          -101.305293,
          -713.605973,
          929.287363,
          -145.320763,
          93.662684,
          279.078953,
          228.196117,
          -251.491182,
          -121.349589
        ],
        [
          -83.760924,
          -576.610909,
          607.910472,
          -893.759994,
          247.881184,
          -141.677361,
          940.77084,
          551.2004,
          -348.079857
        ],
        [
          -97.833645,
          406.880191,
          -217.10023,
          -109.283071,
          348.131221,
          -73.592324,
          443.854232,
          -191.359292,
          -436.388128
        ],
        [
          -69.647688,
          -92.993707,
          370.548505,
          366.105037,
          318.893822,
          -83.085765,
          -122.238431,
          -67.010755,
          -593.911972
        ],
        [
          -45.896343,
          -868.66355,
          923.982694,
          -430.518759,
          232.441075,
          422.772273,
          570.927404,
          -283.010231,
          -412.640322
        ],
        [
          -52.1241,
          -75.64743,
          350.177538,
          -713.000172,
          -24.787761,
          -190.12902,
          1005.131742,
          263.828354,
          -314.728481
        ],
        [
          8.706262,
          -390.284278,
          508.066708,
          -345.494828,
          186.313675,
          235.750837,
          477.106013,
          -17.363736,
          -487.137802
        ],
        [
          -88.107037,
          -508.605275,
          793.709527,
          -256.614898,
          44.550501,
          170.156591,
          398.582364,
          -97.481798,
          -271.411225
        ],
        [
          -24.726845,
          -707.688842,
          787.295981,
          -827.2038,
          261.548427,
          207.804417,
          837.891426,
          167.2622,
          -443.743408
        ],
        [
          -83.3697,
          159.624481,
          144.40934,
          -260.900036,
          11.701525,
          1.273935,
          516.991791,
          -92.576763,
          -249.184503
        ],
        [
          -152.883252,
          43.828707,
          163.124903,
          -625.261794,
          326.402423,
          133.922603,
          489.341897,
          133.92534,
          -323.913379
        ],
        [
          -242.609809,
          15.505694,
          -59.808882,
          19.263099,
          -45.774509,
          458.251187,
          130.722378,
          -95.755971,
          15.417932
        ],
        [
          -302.584677,
          -245.16805,
          332.24512,
          8.114308,
          -257.762855,
          197.162183,
          125.045534,
          -99.639605,
          201.092653
        ],
        [
          -227.460878,
          59.03645,
          -5.105545,
          39.968128,
          -503.360043,
          91.410798,
          25.86221,
          181.292276,
          392.63474
        ],
        [
          -234.670167,
          -32.642383,
          163.122051,
          -59.338103,
          -254.139553,
          -145.588024,
          185.227031,
          327.648398,
          121.628417
        ],
        [
          -173.60345,
          78.96794,
          91.112462,
          -47.804405,
          84.715925,
          -82.264861,
          -75.964016,
          554.412077,
          -215.82227
        ],
        [
          -195.198148,
          -760.586077,
          791.333498,
          434.669968,
          138.205177,
          84.412998,
          -14.797537,
          41.969062,
          -330.337738
        ],
        [
          -146.539767,
          283.279439,
          -54.986084,
          -746.29668,
          123.744809,
          146.086762,
          691.241174,
          123.589205,
          -317.834712
        ],
        [
          -109.11471,
          -30.164322,
          -75.048323,
          22.883975,
          23.968976,
          564.357736,
          27.538403,
          -34.888967,
          -160.385748
        ],
        [
          -213.985599,
          -11.640405,
          93.641803,
          -130.485769,
          -269.350311,
          347.955267,
          273.515256,
          -147.665778,
          123.563885
        ],
        [
          -218.649226,
          88.480275,
          3.253206,
          134.335028,
          -428.007237,
          49.881887,
          102.66622,
          0.781905,
          347.152083
        ],
        [
          -216.102386,
          36.279931,
          192.912821,
          -139.092845,
          -238.174484,
          -155.69789,
          260.434875,
          207.905825,
          105.232815
        ],
        [
          -176.776055,
          -40.275905,
          177.035453,
          158.055339,
          -108.003928,
          -148.127782,
          -100.850733,
          489.900315,
          -96.475475
        ],
        [
          -148.058808,
          -673.672876,
          753.917601,
          -88.234439,
          345.261442,
          209.205686,
          258.189265,
          150.549643,
          -513.608176
        ],
        [
          -31.577585,
          -190.158586,
          442.620176,
          165.548909,
          21.516114,
          -139.053078,
          143.40437,
          -73.304414,
          -314.2664
        ],
        [
          -46.991594,
          -819.97508,
          902.716814,
          -659.671083,
          286.508333,
          95.607032,
          675.740419,
          137.126687,
          -462.49551
        ],
        [
          -106.118197,
          -347.76239,
          458.325343,
          -535.374759,
          47.836279,
          -136.683005,
          813.663086,
          268.203393,
          -314.931991
        ],
        [
          -71.001395,
          -343.577344,
          572.717491,
          -450.34199,
          195.81912,
          28.982429,
          661.529037,
          60.831933,
          -491.708319
        ],
        [
          -116.740756,
          -696.939038,
          979.990142,
          -161.603314,
          -80.709683,
          341.999239,
          335.679258,
          -151.925881,
          -248.650067
        ],
        [
          -51.571284,
          -648.560037,
          610.227786,
          -994.587195,
          222.794245,
          -78.991952,
          1078.325537,
          412.870151,
          -523.201566
        ],
        [
          -72.414852,
          466.100508,
          -43.999212,
          -156.126428,
          245.077277,
          -224.742553,
          416.294934,
          -165.499747,
          -552.41461
        ]
      ]
    },
    {
      "key": "late-a",
      "minEmpties": 13,
      "maxEmpties": 19,
      "scale": 1,
      "bias": -25.72608157300993,
      "tupleWeights": [
        [
          -186.389463,
          9.386788,
          383.583436,
          766.402952,
          9.803658,
          179.567857,
          -288.269323,
          -263.535628,
          -287.525251
        ],
        [
          -155.848241,
          -825.844999,
          1086.037287,
          -420.078234,
          33.82991,
          234.14126,
          539.602691,
          -53.492003,
          -110.16616
        ],
        [
          -108.555364,
          -153.773539,
          188.296658,
          -551.191243,
          -161.893407,
          -116.274656,
          733.238467,
          424.938247,
          137.978421
        ],
        [
          -207.252628,
          -102.006511,
          374.993646,
          -121.678566,
          -66.954443,
          144.68851,
          285.454331,
          67.626691,
          14.824391
        ],
        [
          -210.644477,
          -344.480288,
          524.205561,
          -192.775375,
          -184.131985,
          429.732012,
          352.217994,
          -22.643172,
          98.451832
        ],
        [
          -125.550014,
          -422.736761,
          536.177184,
          -650.494335,
          -44.462872,
          269.063428,
          854.321263,
          215.966302,
          -139.54552
        ],
        [
          -169.67143,
          524.205045,
          56.199526,
          -42.07503,
          -105.883808,
          -185.349113,
          346.644332,
          153.268404,
          -145.457737
        ],
        [
          -151.42057,
          -59.013483,
          235.291466,
          -369.901298,
          62.759664,
          -84.679739,
          432.495067,
          342.326702,
          -116.153129
        ],
        [
          -295.621337,
          76.589823,
          -8.377377,
          2.140774,
          -45.356471,
          315.146892,
          -13.346729,
          214.433349,
          -73.988898
        ],
        [
          -224.98255,
          -175.0108,
          57.727523,
          -164.631866,
          200.814778,
          75.086157,
          101.513674,
          48.010292,
          26.647135
        ],
        [
          -355.572052,
          131.292111,
          -136.371036,
          67.10174,
          27.716266,
          141.307718,
          -4.182248,
          170.012189,
          1.379993
        ],
        [
          -336.255122,
          -103.35857,
          182.989932,
          -27.644985,
          163.517011,
          49.13287,
          45.227387,
          104.163415,
          -43.745282
        ],
        [
          -282.721068,
          1.624735,
          75.122864,
          -2.453478,
          15.267048,
          274.982346,
          39.685851,
          292.071992,
          -128.478309
        ],
        [
          -192.165987,
          -365.257623,
          458.078242,
          177.339117,
          -55.065304,
          232.743498,
          125.905091,
          -44.492649,
          -16.121144
        ],
        [
          -172.087309,
          227.697367,
          129.009554,
          -452.724139,
          -77.879853,
          -101.845265,
          440.81439,
          322.170175,
          -19.132671
        ],
        [
          -244.896901,
          -89.453772,
          31.988602,
          75.600157,
          76.485509,
          277.127646,
          92.674108,
          261.796969,
          -156.815785
        ],
        [
          -225.653421,
          -52.621104,
          84.441011,
          27.035481,
          101.34796,
          85.464324,
          59.25188,
          47.625247,
          -1.101145
        ],
        [
          -267.717831,
          88.114232,
          12.940589,
          90.787811,
          43.279248,
          24.084175,
          -21.027085,
          126.902905,
          14.18273
        ],
        [
          -278.954836,
          33.815883,
          82.802549,
          -102.625914,
          116.881175,
          175.744234,
          56.564222,
          18.151843,
          -2.676292
        ],
        [
          -234.888188,
          -32.656774,
          43.663552,
          -20.20396,
          30.576071,
          183.401966,
          4.017321,
          258.738079,
          -36.428706
        ],
        [
          -239.597401,
          -397.764209,
          515.368405,
          12.157382,
          106.121146,
          215.826473,
          233.698657,
          -41.54311,
          -107.101499
        ],
        [
          -186.440864,
          -26.190104,
          386.343513,
          505.461802,
          -50.798438,
          120.41216,
          72.231499,
          -329.061484,
          -108.264734
        ],
        [
          -184.934704,
          -738.565327,
          973.85439,
          -509.248222,
          37.056171,
          77.540631,
          595.516011,
          244.2711,
          -133.653261
        ],
        [
          -242.575548,
          -215.014149,
          320.767785,
          -360.134627,
          -139.247557,
          -58.620164,
          652.189522,
          261.00729,
          142.532293
        ],
        [
          -144.592451,
          -102.303025,
          296.097605,
          -289.028047,
          -37.324841,
          104.354959,
          300.048472,
          213.92071,
          54.05457
        ],
        [
          -212.109964,
          -525.584427,
          645.526081,
          -93.075832,
          -177.197851,
          430.084212,
          292.700144,
          -137.630961,
          155.375887
        ],
        [
          -128.929771,
          -457.075439,
          609.890225,
          -878.180271,
          51.485909,
          18.955557,
          1042.281634,
          289.871156,
          -150.684119
        ],
        [
          -205.145187,
          716.671994,
          -213.207916,
          46.705774,
          66.805852,
          -403.543523,
          460.499811,
          268.502077,
          -404.137579
        ],
        [
          -217.317388,
          62.394682,
          375.53776,
          706.541729,
          -3.197887,
          272.028233,
          -244.343267,
          -333.281508,
          -292.936008
        ],
        [
          -155.186688,
          -854.690592,
          1049.059189,
          -503.250215,
          75.189483,
          254.368434,
          573.736203,
          147.750777,
          -151.691709
        ],
        [
          -233.314999,
          -90.175852,
          229.487763,
          -540.989034,
          -107.034436,
          -110.86013,
          730.781348,
          326.232793,
          126.437021
        ],
        [
          -236.873044,
          -222.583104,
          437.351392,
          -184.339421,
          -86.909667,
          332.868911,
          287.585565,
          27.746815,
          29.941394
        ],
        [
          -205.504257,
          -437.640621,
          570.672235,
          -366.922518,
          -107.035118,
          339.153148,
          542.25451,
          -74.171995,
          123.743306
        ],
        [
          -74.562314,
          -534.246976,
          589.543206,
          -748.989031,
          12.449106,
          187.5738,
          938.834444,
          -13.312963,
          -78.202001
        ],
        [
          -126.059274,
          560.338265,
          -57.74856,
          -169.813874,
          -49.146035,
          -281.707635,
          414.129309,
          36.315293,
          -19.742862
        ],
        [
          -153.269575,
          17.889081,
          270.968374,
          -346.483979,
          93.079724,
          -161.566863,
          426.322918,
          208.215117,
          -106.019474
        ],
        [
          -122.217461,
          16.678691,
          -45.849487,
          -134.391424,
          0.564171,
          369.414188,
          65.284646,
          149.615097,
          -87.608953
        ],
        [
          -312.178759,
          -16.895419,
          72.697652,
          -130.630326,
          75.659109,
          121.143433,
          -4.415305,
          54.505082,
          81.628717
        ],
        [
          -261.074044,
          -15.524489,
          -135.189565,
          157.007788,
          28.846779,
          7.576474,
          -64.493168,
          153.725835,
          104.674758
        ],
        [
          -375.938035,
          22.014351,
          170.502112,
          -116.499956,
          129.701743,
          85.758984,
          7.549999,
          51.14592,
          -3.814137
        ],
        [
          -278.908609,
          -11.018928,
          -39.764711,
          -59.925358,
          50.657265,
          278.743611,
          28.121136,
          360.350104,
          -100.33837
        ],
        [
          -198.173464,
          -384.242247,
          386.275508,
          204.651646,
          -25.049938,
          260.1507,
          95.509729,
          -108.32833,
          18.180477
        ],
        [
          -181.43316,
          178.167818,
          141.461416,
          -339.201803,
          -25.489753,
          -115.506481,
          445.004294,
          198.052692,
          1.570704
        ],
        [
          -265.912963,
          46.527796,
          -29.038305,
          -9.510254,
          27.888237,
          289.085785,
          69.482808,
          214.143211,
          -82.722465
        ],
        [
          -272.779591,
          -33.41761,
          -2.406915,
          -38.439718,
          173.268749,
          81.37536,
          -25.570991,
          35.999681,
          59.459792
        ],
        [
          -252.173572,
          -60.943047,
          -17.353825,
          93.659829,
          89.727506,
          74.17146,
          69.005051,
          6.087093,
          69.249303
        ],
        [
          -209.077975,
          -87.364503,
          216.401995,
          -105.291509,
          86.389057,
          35.265313,
          109.918822,
          67.629484,
          12.002379
        ],
        [
          -163.881664,
          -177.040244,
          171.961538,
          -17.756278,
          -40.327543,
          198.511052,
          -55.708374,
          394.651615,
          -87.169489
        ],
        [
          -192.591557,
          -364.352411,
          446.76236,
          45.614705,
          72.017117,
          186.342118,
          205.34423,
          -89.92346,
          -41.234129
        ],
        [
          -182.729277,
          -51.875034,
          350.152577,
          479.056218,
          -95.626214,
          157.803811,
          20.700495,
          -170.072309,
          -116.762131
        ],
        [
          -90.590363,
          -772.912471,
          904.795572,
          -493.762797,
          115.543014,
          72.076112,
          584.481563,
          90.254121,
          -82.511376
        ],
        [
          -161.179071,
          -226.666416,
          365.387576,
          -362.664204,
          -203.27711,
          -70.685718,
          594.719981,
          268.494589,
          124.807134
        ],
        [
          -159.233598,
          -122.705662,
          348.276665,
          -147.490111,
          -142.420301,
          8.173608,
          240.179658,
          305.338923,
          84.030156
        ],
        [
          -117.741335,
          -732.741986,
          799.828972,
          -67.592983,
          -154.23347,
          249.072572,
          210.917515,
          -44.362676,
          198.81432
        ],
        [
          -151.514961,
          -418.446914,
          616.65017,
          -961.094575,
          87.805432,
          -11.229978,
          1093.570358,
          211.95449,
          -152.633554
        ],
        [
          -179.528569,
          771.321613,
          -380.796581,
          68.795087,
          54.075728,
          -310.211801,
          392.006515,
          215.179513,
          -265.38774
        ]
      ]
    },
    {
      "key": "late-b",
      "minEmpties": 7,
      "maxEmpties": 12,
      "scale": 1,
      "bias": 290.1272690250953,
      "tupleWeights": [
        [
          -49.211452,
          25.430075,
          347.637342,
          825.930119,
          -100.948905,
          413.509065,
          -201.065087,
          -467.084175,
          -310.89455
        ],
        [
          -18.97972,
          -860.81027,
          1227.535833,
          -393.964522,
          -166.788697,
          143.695537,
          512.343827,
          22.268578,
          -114.655455
        ],
        [
          -38.496296,
          -68.210141,
          175.34938,
          -417.906359,
          -422.665478,
          -3.978159,
          574.284027,
          288.758746,
          277.658099
        ],
        [
          23.727837,
          -99.401512,
          232.803802,
          -99.183396,
          -357.021794,
          207.118267,
          155.168303,
          114.240167,
          245.494824
        ],
        [
          -75.261362,
          -367.244197,
          520.695695,
          -189.088418,
          -406.550828,
          258.221493,
          419.584663,
          62.446557,
          194.004054
        ],
        [
          -85.263913,
          -244.078844,
          542.648717,
          -700.389774,
          -222.22433,
          156.334668,
          911.686197,
          143.229671,
          -62.088456
        ],
        [
          -212.041407,
          694.432642,
          -65.494292,
          158.157457,
          -286.497696,
          -254.929674,
          388.438838,
          219.829497,
          -176.333186
        ],
        [
          -166.421159,
          21.871746,
          343.869035,
          159.479036,
          -174.626946,
          -305.220233,
          265.896191,
          252.837347,
          -49.408499
        ],
        [
          72.582983,
          19.870636,
          144.487042,
          -51.705146,
          -7.872325,
          79.852583,
          136.005638,
          282.088871,
          -198.549627
        ],
        [
          -266.759874,
          54.311387,
          141.05812,
          -21.184285,
          262.835171,
          -50.440992,
          208.656936,
          192.139827,
          -243.072715
        ],
        [
          -85.640633,
          58.18059,
          27.12765,
          -50.236248,
          362.496866,
          64.679183,
          5.607364,
          77.154045,
          -281.95576
        ],
        [
          -27.419729,
          -140.163461,
          79.862853,
          2.674586,
          227.814779,
          306.735281,
          77.502639,
          -118.640527,
          -206.219505
        ],
        [
          -196.811733,
          74.666914,
          148.676739,
          5.054165,
          -65.137585,
          188.790681,
          256.314726,
          25.123849,
          -157.434127
        ],
        [
          -132.566572,
          182.875455,
          244.012134,
          132.078722,
          -230.415796,
          154.45711,
          315.825227,
          -428.912017,
          76.160394
        ],
        [
          -170.756513,
          146.6999,
          304.217002,
          68.099602,
          -202.386743,
          -204.264625,
          420.250421,
          131.055211,
          -66.281758
        ],
        [
          -141.79225,
          -68.004811,
          294.858079,
          95.338557,
          4.307436,
          -50.78612,
          50.489024,
          328.474281,
          -184.253786
        ],
        [
          -128.216985,
          -8.344742,
          74.109428,
          46.706433,
          231.402549,
          -61.508326,
          141.992664,
          159.048635,
          -191.243661
        ],
        [
          1.049794,
          48.10928,
          48.476348,
          76.981168,
          303.925192,
          -6.628298,
          94.103203,
          83.151103,
          -272.557661
        ],
        [
          -70.292464,
          116.597774,
          117.55881,
          -114.539504,
          200.35806,
          293.172208,
          190.786424,
          -96.040066,
          -261.556173
        ],
        [
          -261.13723,
          34.232092,
          142.883583,
          -34.819055,
          -3.061847,
          274.900862,
          285.163209,
          -20.504196,
          -197.376506
        ],
        [
          -168.152107,
          49.915261,
          355.67472,
          90.464981,
          -134.51261,
          129.268027,
          395.53036,
          -194.056631,
          -148.519942
        ],
        [
          -131.485967,
          81.631483,
          295.190657,
          710.352298,
          -300.974424,
          310.516326,
          -44.466489,
          -258.108934,
          -151.518605
        ],
        [
          -103.730238,
          -610.097295,
          967.318802,
          -270.794816,
          -275.616863,
          100.312457,
          529.106746,
          159.468168,
          -89.885451
        ],
        [
          -51.474689,
          -206.018411,
          436.903026,
          -313.008632,
          -360.382217,
          -55.833566,
          412.120404,
          222.950967,
          268.668342
        ],
        [
          -60.181323,
          -206.285584,
          280.011903,
          -43.031376,
          -357.121584,
          30.673108,
          258.288086,
          111.510865,
          300.822742
        ],
        [
          -79.99353,
          -345.847034,
          564.585701,
          -125.674823,
          -416.449253,
          153.464475,
          379.586622,
          -64.375472,
          283.81096
        ],
        [
          -6.585969,
          -230.295411,
          452.547462,
          -791.586754,
          -144.45165,
          -7.108438,
          1093.747049,
          59.316796,
          -44.344285
        ],
        [
          -194.220261,
          916.791435,
          -197.874929,
          142.710471,
          -141.765722,
          -432.219393,
          364.13726,
          279.484263,
          -281.409525
        ],
        [
          -112.114949,
          79.768373,
          350.860506,
          822.181962,
          -123.783628,
          448.089926,
          -291.413431,
          -433.437524,
          -285.696027
        ],
        [
          -24.500046,
          -762.850026,
          996.013165,
          -293.870969,
          -208.141704,
          186.678911,
          504.02496,
          20.370712,
          -15.921479
        ],
        [
          12.978304,
          -151.874368,
          298.442117,
          -327.024293,
          -454.477177,
          -30.636085,
          575.62225,
          214.834085,
          269.481622
        ],
        [
          98.740908,
          -86.208072,
          249.414715,
          -83.943733,
          -464.489952,
          219.545321,
          195.648461,
          58.092957,
          280.193743
        ],
        [
          70.744584,
          -262.896599,
          400.100912,
          -234.74191,
          -404.42676,
          112.1143,
          376.769632,
          80.009553,
          268.880305
        ],
        [
          -15.622497,
          -201.715264,
          454.795325,
          -643.830737,
          -197.783269,
          172.110115,
          904.498244,
          76.377686,
          -94.899901
        ],
        [
          -118.896134,
          740.321871,
          -81.956824,
          105.45662,
          -270.192661,
          -204.441385,
          289.508838,
          254.030643,
          -169.549994
        ],
        [
          -162.299988,
          54.297537,
          453.366628,
          202.126838,
          -190.688681,
          -391.562099,
          258.221371,
          238.284468,
          -77.71536
        ],
        [
          -71.817685,
          -28.360313,
          220.047261,
          6.154636,
          37.118842,
          -46.928924,
          170.199719,
          219.788386,
          -178.412936
        ],
        [
          -40.855738,
          63.503671,
          69.255606,
          79.447888,
          211.229187,
          -100.738418,
          152.849801,
          164.628156,
          -233.019869
        ],
        [
          -28.589643,
          19.533578,
          200.688421,
          95.185995,
          284.414708,
          15.904001,
          -52.302849,
          42.08206,
          -250.101278
        ],
        [
          -81.133086,
          -135.677984,
          209.812996,
          -69.188983,
          276.752113,
          124.10263,
          120.549287,
          -95.97635,
          -157.82846
        ],
        [
          -123.196291,
          76.711155,
          50.432686,
          -50.683499,
          -51.44652,
          347.26344,
          262.371986,
          14.820711,
          -208.277373
        ],
        [
          -115.45053,
          63.018733,
          317.676552,
          96.237008,
          -203.801201,
          177.686828,
          315.352079,
          -320.899258,
          1.294826
        ],
        [
          -152.753579,
          61.981214,
          241.667694,
          181.282488,
          -271.266645,
          -237.3307,
          266.257442,
          310.12006,
          -10.408776
        ],
        [
          -51.586093,
          24.293847,
          180.7372,
          -86.741069,
          -20.522836,
          45.882012,
          198.430262,
          312.851355,
          -223.168254
        ],
        [
          -86.526634,
          -141.953659,
          197.194087,
          -65.902963,
          312.530331,
          -96.757538,
          266.035065,
          207.711463,
          -301.806485
        ],
        [
          -127.401293,
          141.152757,
          52.797262,
          68.597582,
          323.394578,
          66.781541,
          -35.242049,
          -56.516831,
          -239.54081
        ],
        [
          -41.414846,
          -6.915048,
          -15.32711,
          -127.887347,
          247.525017,
          214.989573,
          251.871187,
          -165.163667,
          -163.453083
        ],
        [
          -147.143403,
          57.610146,
          169.396863,
          -82.287366,
          5.662294,
          215.924722,
          248.118115,
          -28.109146,
          -157.651962
        ],
        [
          -164.584095,
          77.752653,
          316.712923,
          10.829487,
          -114.081748,
          182.431533,
          418.211099,
          -290.394825,
          -71.048945
        ],
        [
          -129.215952,
          90.219058,
          365.790502,
          726.772983,
          -304.565318,
          219.34541,
          -45.979786,
          -334.068722,
          -150.317771
        ],
        [
          15.123327,
          -652.806204,
          935.943667,
          -288.621649,
          -258.092505,
          63.227176,
          484.643114,
          123.215189,
          -23.920894
        ],
        [
          -21.099014,
          -286.346948,
          424.522189,
          -276.745622,
          -395.180865,
          -62.164942,
          372.478322,
          246.17967,
          298.802575
        ],
        [
          5.692648,
          -61.284951,
          164.368151,
          -126.949077,
          -428.370753,
          132.933422,
          239.101314,
          180.890923,
          284.112361
        ],
        [
          -116.081978,
          -348.11915,
          550.567104,
          -157.749437,
          -428.578727,
          260.178473,
          452.474354,
          -144.866732,
          248.854806
        ],
        [
          -29.075236,
          -208.366684,
          466.120875,
          -757.733115,
          -197.472605,
          -86.200932,
          1116.455722,
          119.542365,
          -97.095472
        ],
        [
          -138.962057,
          864.969406,
          -158.718987,
          191.820826,
          -147.312413,
          -405.990017,
          290.35381,
          349.364422,
          -329.938057
        ]
      ]
    },
    {
      "key": "endgame",
      "minEmpties": 0,
      "maxEmpties": 6,
      "scale": 1,
      "bias": 2008.5988320633548,
      "tupleWeights": [
        [
          149.496777,
          91.126422,
          267.003151,
          975.161247,
          -300.708826,
          419.037768,
          135.523318,
          -2.238613,
          -394.487581
        ],
        [
          261.455671,
          -480.576479,
          1317.12557,
          66.265359,
          -341.873049,
          291.408028,
          735.534973,
          -51.966747,
          -193.142313
        ],
        [
          432.108035,
          -172.546877,
          854.472469,
          -109.351486,
          -440.011216,
          -62.861127,
          732.375304,
          242.874801,
          109.628512
        ],
        [
          309.931153,
          -8.488725,
          715.284602,
          -142.16419,
          -444.371843,
          246.016008,
          720.805895,
          73.909299,
          116.265378
        ],
        [
          271.321451,
          -105.98655,
          714.950905,
          -206.871511,
          -456.174624,
          265.173168,
          844.488137,
          49.521996,
          105.225112
        ],
        [
          224.147974,
          73.989868,
          668.366946,
          -369.64782,
          -283.841227,
          -174.437737,
          1262.33768,
          176.218738,
          -148.400297
        ],
        [
          221.93846,
          934.504383,
          167.201461,
          127.489858,
          -312.978178,
          -25.701356,
          127.705982,
          282.821193,
          -267.180875
        ],
        [
          240.792528,
          -45.187555,
          888.147624,
          819.661356,
          -227.813568,
          -213.733186,
          89.726101,
          253.290728,
          -227.305351
        ],
        [
          79.908967,
          -340.186998,
          1102.956567,
          151.350569,
          24.583371,
          -175.685068,
          355.127993,
          171.957131,
          -107.113626
        ],
        [
          242.841331,
          -236.085719,
          613.968069,
          104.220454,
          187.15852,
          -211.622518,
          389.536123,
          28.516868,
          35.545956
        ],
        [
          92.71947,
          17.505438,
          521.08836,
          -15.800811,
          226.013295,
          -66.831625,
          581.609332,
          -27.977635,
          -95.438682
        ],
        [
          285.526472,
          105.579683,
          418.657211,
          -172.366208,
          209.995578,
          51.771443,
          646.597775,
          -198.981674,
          -40.29599
        ],
        [
          276.138894,
          175.478592,
          304.290717,
          -405.611235,
          49.362171,
          246.216095,
          1099.100071,
          -222.326123,
          -165.393129
        ],
        [
          112.518624,
          850.494312,
          173.410345,
          200.082139,
          -355.009789,
          244.237882,
          695.056307,
          -178.520145,
          -192.838859
        ],
        [
          92.153882,
          57.357788,
          847.647889,
          805.693476,
          -316.923658,
          -211.233713,
          226.275568,
          208.13861,
          -215.33861
        ],
        [
          162.709246,
          -340.364832,
          1095.199264,
          119.223514,
          -12.758027,
          -230.546357,
          380.104254,
          278.307275,
          -185.931177
        ],
        [
          176.2296,
          -253.602325,
          677.723669,
          119.865018,
          212.56019,
          -245.031899,
          438.242726,
          -21.444696,
          -35.784406
        ],
        [
          127.35995,
          65.064761,
          496.093728,
          -29.150711,
          187.427685,
          -10.641109,
          407.11937,
          -44.267158,
          -84.290083
        ],
        [
          143.374923,
          123.141552,
          249.836196,
          -225.244987,
          197.780947,
          48.142707,
          743.633884,
          -210.864494,
          -22.692602
        ],
        [
          265.176675,
          117.488754,
          382.436899,
          -280.912196,
          0.160047,
          216.62327,
          1061.93529,
          -152.747957,
          -162.913627
        ],
        [
          169.99874,
          735.099873,
          307.516255,
          13.767418,
          -229.064393,
          187.609749,
          895.446452,
          -185.23249,
          -245.628962
        ],
        [
          192.428171,
          160.100303,
          162.03999,
          884.184236,
          -342.909508,
          381.282904,
          184.555601,
          -40.434633,
          -279.864082
        ],
        [
          192.886986,
          -338.319292,
          1202.221183,
          -7.871789,
          -282.368417,
          182.707716,
          691.459022,
          -65.009269,
          -133.449686
        ],
        [
          255.387209,
          -116.192372,
          736.136426,
          19.185431,
          -397.541296,
          -55.532911,
          594.980036,
          280.269617,
          151.257887
        ],
        [
          275.051493,
          -55.335855,
          701.975896,
          -34.404133,
          -412.60229,
          198.176378,
          712.280549,
          159.11185,
          98.722718
        ],
        [
          187.130373,
          16.059699,
          690.929854,
          -180.647311,
          -435.188605,
          357.487723,
          808.728221,
          28.14435,
          104.26864
        ],
        [
          246.923208,
          -46.94446,
          652.729239,
          -369.489998,
          -289.062433,
          8.603555,
          1297.029734,
          353.496883,
          -209.751112
        ],
        [
          165.664189,
          991.584463,
          167.878312,
          106.758924,
          -250.557083,
          -1.848271,
          208.05575,
          377.501749,
          -345.940732
        ],
        [
          155.415164,
          144.035062,
          226.193251,
          919.310592,
          -245.850613,
          429.761109,
          223.471625,
          -54.890105,
          -423.190837
        ],
        [
          191.930512,
          -375.304587,
          1251.38186,
          30.172628,
          -271.528678,
          277.482881,
          698.726948,
          11.978315,
          -250.969784
        ],
        [
          274.458497,
          -91.871735,
          758.986879,
          -89.54612,
          -359.245274,
          16.385575,
          696.326661,
          121.406115,
          98.930684
        ],
        [
          285.990469,
          -26.661152,
          663.721557,
          -5.431934,
          -448.427919,
          249.480201,
          629.938047,
          17.765174,
          163.771257
        ],
        [
          296.055693,
          -74.411628,
          648.82423,
          -264.89988,
          -474.680752,
          265.077795,
          885.529579,
          69.278181,
          131.764385
        ],
        [
          231.002604,
          100.897812,
          634.032486,
          -404.999449,
          -335.499137,
          -64.85684,
          1217.042591,
          211.410199,
          -176.636741
        ],
        [
          161.88518,
          1004.290498,
          98.343563,
          134.281517,
          -314.2598,
          19.817121,
          239.346694,
          261.382261,
          -291.099875
        ],
        [
          130.451837,
          -29.069386,
          938.679937,
          725.594404,
          -230.29226,
          -269.025889,
          262.238333,
          198.291028,
          -223.394563
        ],
        [
          221.27427,
          -374.119453,
          1076.759707,
          140.431582,
          24.218033,
          -182.077536,
          239.187679,
          267.658474,
          -174.713593
        ],
        [
          205.574877,
          -222.348185,
          575.753673,
          4.301198,
          266.576326,
          -231.840336,
          359.801086,
          73.909477,
          -60.416731
        ],
        [
          142.828706,
          41.301861,
          353.729111,
          75.894143,
          242.109687,
          13.108285,
          411.253043,
          -99.050886,
          -99.216268
        ],
        [
          205.306711,
          68.342098,
          386.353013,
          -272.766841,
          175.493267,
          89.465556,
          684.609919,
          -123.67293,
          -106.665616
        ],
        [
          199.198381,
          182.205866,
          297.392848,
          -453.041767,
          -7.540583,
          334.203245,
          1181.502291,
          -236.383892,
          -205.387245
        ],
        [
          229.339279,
          755.492604,
          189.393728,
          16.798265,
          -303.43687,
          253.265981,
          815.525173,
          -228.298456,
          -167.990137
        ],
        [
          204.655478,
          143.102561,
          801.466997,
          816.959559,
          -349.369795,
          -193.318364,
          152.920135,
          284.453929,
          -227.743042
        ],
        [
          254.603313,
          -253.761999,
          977.963066,
          117.192191,
          74.374542,
          -236.06854,
          305.36966,
          214.106177,
          -176.493968
        ],
        [
          98.802597,
          -159.657933,
          648.056883,
          53.332292,
          227.68947,
          -159.473688,
          409.314261,
          10.98679,
          -58.356786
        ],
        [
          44.63919,
          -33.818245,
          507.794613,
          26.296239,
          212.489438,
          -43.277044,
          499.99184,
          -69.121587,
          -62.205184
        ],
        [
          191.000823,
          91.155088,
          448.074894,
          -171.716217,
          158.596436,
          17.392711,
          666.424847,
          -171.032656,
          -55.255751
        ],
        [
          291.750779,
          166.136867,
          314.161269,
          -299.02707,
          -21.922113,
          213.606146,
          1086.913575,
          -206.519255,
          -141.540672
        ],
        [
          195.701743,
          758.697099,
          266.759316,
          9.997809,
          -252.064721,
          228.985767,
          919.519631,
          -204.769162,
          -240.54035
        ],
        [
          97.850926,
          177.707541,
          185.571078,
          1025.48998,
          -360.613189,
          294.046835,
          138.88661,
          31.791372,
          -276.467285
        ],
        [
          246.274109,
          -372.448919,
          1214.508523,
          129.814799,
          -319.123291,
          209.150762,
          718.776544,
          -45.653975,
          -189.603919
        ],
        [
          305.143207,
          -208.916995,
          976.611509,
          -24.82545,
          -425.148072,
          -55.288107,
          592.018829,
          182.352955,
          151.214016
        ],
        [
          252.919325,
          -3.988271,
          601.868688,
          102.25344,
          -479.291941,
          66.034643,
          709.750976,
          215.978454,
          167.065185
        ],
        [
          270.301039,
          32.719101,
          733.555066,
          -131.518669,
          -431.67794,
          141.168201,
          821.965074,
          -28.089332,
          106.163164
        ],
        [
          225.547321,
          -0.838956,
          747.00647,
          -393.160587,
          -242.420348,
          -60.234851,
          1263.028627,
          262.934827,
          -244.445473
        ],
        [
          161.001039,
          966.247288,
          175.020052,
          160.590473,
          -232.865588,
          -15.723568,
          165.452722,
          351.134191,
          -343.248519
        ]
      ]
    }
  ]
});
const GENERATED_MPC_PROFILE = null;

export { GENERATED_EVALUATION_PROFILE, GENERATED_MOVE_ORDERING_PROFILE, GENERATED_TUPLE_RESIDUAL_PROFILE, GENERATED_MPC_PROFILE };
export default GENERATED_EVALUATION_PROFILE;
